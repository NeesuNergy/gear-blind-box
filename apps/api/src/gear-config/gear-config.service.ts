import { Injectable } from '@nestjs/common';
import type { ConfigManifest, GearItem, ScoreWeightConfig } from '@gearblindbox/shared-types';

export interface GearConfigSnapshot {
  configVersion: ConfigManifest['activeVersions'];
  weights: ScoreWeightConfig;
  scoreBounds: { min: number; max: number };
  items: Record<'weapons' | 'helmets' | 'armors' | 'operators', GearItem[]>;
}

/**
 * 装备/干员配置加载与查询服务(骨架阶段)。
 *
 * 完整实现应按 docs/03-spec/CONFIG-SCHEMA.md:
 * 1. 读取 configs/game-data/manifest.json 确定各类别当前生效版本
 * 2. 加载对应版本的 JSON 文件并按 CONFIG-SCHEMA.md 的 Schema 校验
 * 3. 计算 scoreBounds(当前配置下理论可达成的最小/最大综合评分)
 * 4. 配置变更后主动失效 Redis 中的预筛索引缓存(见 ARCHITECTURE.md 第 6 节)
 *
 * 当前阶段仅搭建骨架,不接入文件加载与校验逻辑。
 */
@Injectable()
export class GearConfigService {
  getCurrentConfig(): GearConfigSnapshot {
    throw new Error(
      'GearConfigService.getCurrentConfig 尚未实现,业务逻辑落地时请参考 docs/03-spec/CONFIG-SCHEMA.md',
    );
  }
}
