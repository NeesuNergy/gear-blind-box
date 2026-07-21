import { Body, Controller, Headers, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { TrackEventsRequestDto } from './dto/track-events.dto';
import { AnalyticsService } from './analytics.service';

/**
 * 对应 docs/03-spec/API-SPEC.md 3.3 节:POST /api/v1/events
 */
@Controller('events')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  track(
    @Body() dto: TrackEventsRequestDto,
    @Headers('x-anonymous-id') anonymousId: string,
  ): Record<string, never> {
    this.analyticsService.track(dto, anonymousId);
    return {};
  }
}
