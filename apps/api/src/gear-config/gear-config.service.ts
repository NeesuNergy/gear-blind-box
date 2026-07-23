import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { GEAR_CATEGORIES } from '@gearblindbox/shared-types';
import type {
  GearCategory,
  GearItem,
  GearRarity,
  ScoreWeightConfig,
} from '@gearblindbox/shared-types';
import type { GearPools } from '@gearblindbox/scoring-engine';
import { computeScoreBounds } from '@gearblindbox/scoring-engine';
import type { GearItem as PrismaGearItem } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export interface GearConfigSnapshot {
  /** 当前官方 config_revisions.versionTag,见 docs/03-spec/DATA-MODEL.md 2.3 节。 */
  configVersion: string;
  weights: ScoreWeightConfig;
  scoreBounds: { min: number; max: number };
  items: Record<'weapons' | 'helmets' | 'armors' | 'operators', GearItem[]>;
}

/** 官方配置单例行的固定主键,见 docs/03-spec/CONFIG-SCHEMA.md 第 2.2/2.3 节。 */
const OFFICIAL_CONFIG_ID = 'official' as const;

const CATEGORY_TO_SNAPSHOT_KEY: Record<GearCategory, keyof GearConfigSnapshot['items']> = {
  weapon: 'weapons',
  helmet: 'helmets',
  armor: 'armors',
  operator: 'operators',
};

function isGearCategory(value: string): value is GearCategory {
  return (GEAR_CATEGORIES as readonly string[]).includes(value);
}

const GEAR_RARITIES: readonly GearRarity[] = ['common', 'rare', 'epic', 'legendary'] as const;

function isGearRarity(value: string): value is GearRarity {
  return (GEAR_RARITIES as readonly string[]).includes(value);
}

/**
 * 装备/干员配置加载与查询服务。
 *
 * 按 docs/03-spec/CONFIG-SCHEMA.md / ADR-0002:
 * 1. 从 PostgreSQL 读取 gear_items / score_weight_configs / config_revisions
 * 2. 组装 EffectivePool = 官方 enabled 条目(V0.1 无用户方案,等价于官方启用条目全集)
 * 3. 计算 scoreBounds(见 SCORING-SPEC.md 3.3 节)
 *
 * Redis 预筛索引缓存属于 V0.2 范围(见 ARCHITECTURE.md 第 8 节),V0.1 每次直接查库。
 */
@Injectable()
export class GearConfigService {
  private readonly logger = new Logger(GearConfigService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * 加载当前有效池(EffectivePool)与权重配置,供 DrawService 调用评分引擎使用。
   * 抛出的异常代表官方配置本身缺失/不合法,属于服务端配置错误(非用户输入错误)。
   */
  async getEffectivePool(): Promise<{
    pools: GearPools;
    weights: ScoreWeightConfig;
    versionTag: string;
  }> {
    const [revision, weightConfigRow, itemRows] = await Promise.all([
      this.prisma.configRevision.findUnique({ where: { id: OFFICIAL_CONFIG_ID } }),
      this.prisma.scoreWeightConfig.findUnique({ where: { id: OFFICIAL_CONFIG_ID } }),
      this.prisma.gearItem.findMany({ where: { enabled: true } }),
    ]);

    if (!revision) {
      throw new InternalServerErrorException(
        '未找到官方配置版本(config_revisions.id="official"),请先执行 pnpm db:seed,见 docs/03-spec/CONFIG-SCHEMA.md',
      );
    }
    if (!weightConfigRow) {
      throw new InternalServerErrorException(
        '未找到官方评分权重配置(score_weight_configs.id="official"),请先执行 pnpm db:seed',
      );
    }

    const versionTag = revision.versionTag;
    const weights: ScoreWeightConfig = {
      versionTag,
      weaponWeight: weightConfigRow.weaponWeight,
      helmetWeight: weightConfigRow.helmetWeight,
      armorWeight: weightConfigRow.armorWeight,
      operatorWeight: weightConfigRow.operatorWeight,
    };

    const pools: GearPools = { weapon: [], helmet: [], armor: [], operator: [] };
    for (const row of itemRows) {
      const item = this.toSharedGearItem(row, versionTag);
      pools[item.category].push(item);
    }

    for (const category of GEAR_CATEGORIES) {
      if (pools[category].length === 0) {
        throw new InternalServerErrorException(
          `官方配置中 category="${category}" 没有任何 enabled=true 的条目,无法组装有效池,见 docs/03-spec/CONFIG-SCHEMA.md`,
        );
      }
    }

    return { pools, weights, versionTag };
  }

  async getCurrentConfig(): Promise<GearConfigSnapshot> {
    const { pools, weights, versionTag } = await this.getEffectivePool();
    const scoreBounds = computeScoreBounds(pools, weights);

    const items = {} as GearConfigSnapshot['items'];
    for (const category of GEAR_CATEGORIES) {
      items[CATEGORY_TO_SNAPSHOT_KEY[category]] = pools[category];
    }

    return { configVersion: versionTag, weights, scoreBounds, items };
  }

  private toSharedGearItem(row: PrismaGearItem, versionTag: string): GearItem {
    if (!isGearCategory(row.category)) {
      this.logger.error(`gear_items.id="${row.id}" 的 category="${row.category}" 不是合法枚举值`);
      throw new InternalServerErrorException(
        `装备条目 "${row.id}" 的 category 非法,请检查数据库数据`,
      );
    }
    if (row.rarity !== null && !isGearRarity(row.rarity)) {
      this.logger.error(`gear_items.id="${row.id}" 的 rarity="${row.rarity}" 不是合法枚举值`);
      throw new InternalServerErrorException(
        `装备条目 "${row.id}" 的 rarity 非法,请检查数据库数据`,
      );
    }

    return {
      id: row.id,
      category: row.category,
      subCategory: row.subCategory ?? undefined,
      name: row.name,
      baseScore: row.baseScore,
      rarity: row.rarity ?? undefined,
      weight: row.weight,
      imageUrl: row.imageUrl ?? undefined,
      description: row.description ?? undefined,
      versionTag,
      enabled: row.enabled,
    };
  }
}
