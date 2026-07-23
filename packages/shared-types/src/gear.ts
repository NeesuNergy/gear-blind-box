/**
 * 对应 docs/03-spec/DATA-MODEL.md 与 docs/03-spec/CONFIG-SCHEMA.md。
 * 仅为类型契约,不包含任何业务逻辑。
 */

export type GearCategory = 'weapon' | 'helmet' | 'armor' | 'operator';

/** GearCategory 的运行时枚举值,供遍历四个槶位、DTO 校验等场景使用,需与上方联合类型保持同步。 */
export const GEAR_CATEGORIES: readonly GearCategory[] = [
  'weapon',
  'helmet',
  'armor',
  'operator',
] as const;

export type GearRarity = 'common' | 'rare' | 'epic' | 'legendary';

/**
 * 武器/头盔/护甲/干员通用结构。
 * 持久化在 PostgreSQL `gear_items`;`versionTag` 由加载服务根据 `config_revisions` 注入到内存对象,
 * 便于写入 DrawRecord 快照,不一定作为表列存在。
 */
export interface GearItem {
  id: string;
  category: GearCategory;
  subCategory?: string;
  name: string;
  baseScore: number;
  rarity?: GearRarity;
  weight?: number;
  imageUrl?: string;
  description?: string;
  versionTag: string;
  enabled: boolean;
}

/** 评分权重配置,四项之和必须为 1(见 SCORING-SPEC.md 第 3 节)。 */
export interface ScoreWeightConfig {
  versionTag: string;
  weaponWeight: number;
  helmetWeight: number;
  armorWeight: number;
  operatorWeight: number;
}

/**
 * 后续用户方案(V0.1 不实现):相对官方默认池的排除列表。
 * 不可改 baseScore。
 */
export interface UserScheme {
  id: string;
  ownerUserId: string;
  name: string;
  excludedItemIds: string[];
  shareCode: string;
  basedOnVersionTag?: string;
}
