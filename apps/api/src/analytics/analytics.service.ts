import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { TrackEventsRequestDto } from './dto/track-events.dto';

export interface TrackRequestContext {
  anonymousId: string;
  ipHash?: string;
  userAgent?: string;
}

/**
 * 埋点事件接收服务,按 docs/03-spec/ANALYTICS-SPEC.md 第 4 节:
 * 1. 补全 anonymousId(来自请求头)、ipHash(对原始 IP 哈希,不落库明文)
 * 2. 批量写入 AnalyticsEvent 表(见 DATA-MODEL.md 3.2 节)
 * 3. 写入失败允许静默丢弃,不得影响响应(见 API-SPEC.md 3.3 节"该接口对失败宽容")
 */
@Injectable()
export class AnalyticsService {
  private readonly logger = new Logger(AnalyticsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async track(dto: TrackEventsRequestDto, context: TrackRequestContext): Promise<void> {
    try {
      await this.prisma.analyticsEvent.createMany({
        data: dto.events.map((event) => ({
          eventName: event.eventName,
          anonymousId: context.anonymousId,
          sessionId: event.sessionId,
          properties: event.properties
            ? (event.properties as Prisma.InputJsonValue)
            : Prisma.JsonNull,
          ipHash: context.ipHash,
          userAgent: context.userAgent,
        })),
      });
    } catch (error) {
      this.logger.warn(`埋点事件批量写入失败,已静默丢弃(不影响响应):${(error as Error).message}`);
    }
  }
}
