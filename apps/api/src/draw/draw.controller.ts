import { Body, Controller, Headers, Post } from '@nestjs/common';
import type { DrawResult } from '@gearblindbox/shared-types';
import { DrawRequestDto } from './dto/draw-request.dto';
import { DrawService } from './draw.service';

/**
 * 对应 docs/03-spec/API-SPEC.md 3.2 节:POST /api/v1/draw
 * 限流策略(按 X-Anonymous-Id,每分钟 ≤ 20 次)见 API-SPEC.md 第 5 节,
 * 骨架阶段暂未接入 @nestjs/throttler 的接口级限流装饰器,业务实现时补充。
 */
@Controller('draw')
export class DrawController {
  constructor(private readonly drawService: DrawService) {}

  @Post()
  draw(@Body() dto: DrawRequestDto, @Headers('x-anonymous-id') _anonymousId: string): DrawResult {
    return this.drawService.draw(dto);
  }
}
