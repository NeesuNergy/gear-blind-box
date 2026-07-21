import { Injectable, Logger } from '@nestjs/common';
import { TrackEventsRequestDto } from './dto/track-events.dto';

/**
 * 埋点事件接收服务(骨架阶段)。
 *
 * 完整实现应按 docs/03-spec/ANALYTICS-SPEC.md 第 4 节:
 * 1. 补全 anonymousId(来自请求头)、ipHash(对原始 IP 哈希,不落库明文)
 * 2. 批量写入 AnalyticsEvent 表(见 DATA-MODEL.md 3.2 节)
 * 3. 写入失败允许静默丢弃,不得影响响应(见 API-SPEC.md 3.3 节"该接口对失败宽容")
 *
 * 当前阶段仅搭建骨架,不接入数据库写入逻辑。
 */
@Injectable()
export class AnalyticsService {
  private readonly logger = new Logger(AnalyticsService.name);

  track(_dto: TrackEventsRequestDto, _anonymousId: string): void {
    this.logger.warn(
      'AnalyticsService.track 尚未实现落库逻辑,业务落地时请参考 docs/03-spec/ANALYTICS-SPEC.md 第 4 节',
    );
  }
}
