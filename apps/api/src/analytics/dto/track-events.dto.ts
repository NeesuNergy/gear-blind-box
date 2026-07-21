import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsIn,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { ANALYTICS_EVENT_NAMES, type AnalyticsEventName } from '@gearblindbox/shared-types';

/**
 * POST /api/v1/events 请求体校验规则,对应 docs/03-spec/API-SPEC.md 3.3 节
 * 与 docs/03-spec/ANALYTICS-SPEC.md 第 3 节事件清单。
 */
export class AnalyticsEventDto {
  @IsString()
  @IsIn(ANALYTICS_EVENT_NAMES)
  eventName!: AnalyticsEventName;

  @IsString()
  @IsNotEmpty()
  sessionId!: string;

  @IsOptional()
  @IsObject()
  properties?: Record<string, unknown>;

  @IsOptional()
  @IsString()
  clientTimestamp?: string;
}

export class TrackEventsRequestDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => AnalyticsEventDto)
  events!: AnalyticsEventDto[];
}
