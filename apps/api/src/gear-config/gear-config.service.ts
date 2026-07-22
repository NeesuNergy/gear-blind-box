import { Injectable } from '@nestjs/common';
import type { GearItem, ScoreWeightConfig } from '@gearblindbox/shared-types';

export interface GearConfigSnapshot {
  /** 当前官方 config_revisions.versionTag */
  configVersion: string;
  weights: ScoreWeightConfig;
  scoreBounds: { min: number; max: number };
  items: Record<'weapons' | 'helmets' | 'armors' | 'operators', GearItem[]>;
}

/**
 * 装备/干员配置加载与查询服务(骨架阶段)。
 *
 * 完整实现应按 docs/03-spec/CONFIG-SCHEMA.md / ADR-0002:
 * 1. 从 PostgreSQL 读取 gear_items / score_weight_configs / config_revisions
 * 2. 组装 EffectivePool = 官方 enabled 条目 − (未来)用户方案 excludedItemIds
 * 3. 计算 scoreBounds(当前有效池下理论可达成的最小/最大综合评分)
 * 4. 配置 versionTag 变更后主动失效 Redis 预筛索引缓存
 *
 * 当前阶段仅搭建骨架,不接入数据库加载逻辑。
 */
@Injectable()
export class GearConfigService {
  getCurrentConfig(): GearConfigSnapshot {
    throw new Error(
      'GearConfigService.getCurrentConfig 尚未实现,业务逻辑落地时请参考 docs/03-spec/CONFIG-SCHEMA.md',
    );
  }
}
