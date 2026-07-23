import {
  BadRequestException,
  Body,
  Controller,
  Headers,
  HttpCode,
  HttpStatus,
  Post,
  Req,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { Request } from 'express';
import { EVENTS_RATE_LIMIT, EVENTS_RATE_LIMIT_WINDOW_MS } from './analytics.constants';
import { TrackEventsRequestDto } from './dto/track-events.dto';
import { hashIp } from './ip-hash.util';
import { AnalyticsService } from './analytics.service';

/**
 * 对应 docs/03-spec/API-SPEC.md 3.3 节:POST /api/v1/events
 * 该接口对失败宽容:即使写入失败也始终返回 { success: true }(结构非法的请求体仍会被
 * 全局 ValidationPipe 拒绝为 400,这属于"请求体结构本身非法"的例外场景)。
 */
@Controller('events')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Throttle({
    default: {
      limit: EVENTS_RATE_LIMIT,
      ttl: EVENTS_RATE_LIMIT_WINDOW_MS,
      getTracker: (req: Request) =>
        (req.headers['x-anonymous-id'] as string | undefined) ?? req.ip ?? 'unknown',
    },
  })
  @Post()
  @HttpCode(HttpStatus.OK)
  async track(
    @Body() dto: TrackEventsRequestDto,
    @Headers('x-anonymous-id') anonymousId: string | undefined,
    @Req() request: Request,
  ): Promise<Record<string, never>> {
    if (!anonymousId) {
      throw new BadRequestException('缺少必填请求头 X-Anonymous-Id');
    }

    await this.analyticsService.track(dto, {
      anonymousId,
      ipHash: request.ip ? hashIp(request.ip) : undefined,
      userAgent: request.headers['user-agent'],
    });
    return {};
  }
}
