import { BadRequestException, Body, Controller, Headers, Post } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { Request } from 'express';
import type { DrawResult } from '@gearblindbox/shared-types';
import { DRAW_RATE_LIMIT, DRAW_RATE_LIMIT_WINDOW_MS } from './draw.constants';
import { DrawRequestDto } from './dto/draw-request.dto';
import { DrawService } from './draw.service';

/**
 * 对应 docs/03-spec/API-SPEC.md 3.2 节:POST /api/v1/draw
 * 限流按 X-Anonymous-Id(而非 IP)追踪,覆盖全局按 IP 的限流(见 AppModule)。
 */
@Controller('draw')
export class DrawController {
  constructor(private readonly drawService: DrawService) {}

  @Throttle({
    default: {
      limit: DRAW_RATE_LIMIT,
      ttl: DRAW_RATE_LIMIT_WINDOW_MS,
      getTracker: (req: Request) =>
        (req.headers['x-anonymous-id'] as string | undefined) ?? req.ip ?? 'unknown',
    },
  })
  @Post()
  draw(
    @Body() dto: DrawRequestDto,
    @Headers('x-anonymous-id') anonymousId?: string,
  ): Promise<DrawResult> {
    if (!anonymousId) {
      throw new BadRequestException('缺少必填请求头 X-Anonymous-Id');
    }
    return this.drawService.draw(dto, anonymousId);
  }
}
