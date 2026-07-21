/**
 * 对应 docs/03-spec/DATA-MODEL.md 第 2 节 与 docs/03-spec/CONFIG-SCHEMA.md。
 * 仅为类型契约,不包含任何业务逻辑。
 */

export type GearCategory = 'weapon' | 'helmet' | 'armor' | 'operator';

export type GearRarity = 'common' | 'rare' | 'epic' | 'legendary';

/** 武器/头盔/护甲/干员通用结构,来自版本化配置文件(configs/game-data),非数据库表。 */
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

/** 各类别当前生效的配置版本号(见 CONFIG-SCHEMA.md 第 2.3 节)。 */
export interface ConfigActiveVersions {
  weapons: string;
  helmets: string;
  armors: string;
  operators: string;
  weights: string;
}

export interface ConfigManifestHistoryEntry {
  category: GearCategory | 'weights';
  versionTag: string;
  publishedAt: string;
  note: string;
}

export interface ConfigManifest {
  activeVersions: ConfigActiveVersions;
  history: ConfigManifestHistoryEntry[];
}
