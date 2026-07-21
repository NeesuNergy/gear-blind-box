import { Injectable } from '@nestjs/common';
import type { DrawResult } from '@gearblindbox/shared-types';
import { DrawRequestDto } from './dto/draw-request.dto';

/**
 * 抽取业务流程编排(骨架阶段)。
 *
 * 完整实现应按 docs/02-architecture/ARCHITECTURE.md 第 5 节的数据流:
 * 1. 读取当前生效配置版本(GearConfigService)
 * 2. 读取/重建评分区间预计算索引(Redis 缓存)
 * 3. 调用 @gearblindbox/scoring-engine 的 drawCombination 计算结果
 * 4. 落库 DrawRecord(含配置版本快照,见 DATA-MODEL.md 3.1 节)
 * 5. 返回结果给 controller
 *
 * 当前阶段仅搭建骨架,不接入数据库/缓存/评分引擎的具体调用。
 */
@Injectable()
export class DrawService {
  draw(_dto: DrawRequestDto): DrawResult {
    throw new Error(
      'DrawService.draw 尚未实现,业务逻辑落地时请参考 docs/02-architecture/ARCHITECTURE.md 第 5 节与 docs/03-spec/SCORING-SPEC.md',
    );
  }
}
