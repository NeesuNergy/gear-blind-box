/**
 * 官方配置初始数据。
 * - 开发/CI:`pnpm config:validate` 直接校验本文件约束
 * - 写入 DB:`pnpm db:seed` 读取本文件 upsert
 *
 * 真实装备数据请替换占位条目,并将 enabled 设为 true。
 * 规范见 docs/03-spec/CONFIG-SCHEMA.md / DATA-MODEL.md。
 */

export const OFFICIAL_CONFIG_ID = 'official' as const;

export const OFFICIAL_VERSION_TAG = '2026.07';

export const OFFICIAL_WEIGHTS = {
  weaponWeight: 0.4,
  helmetWeight: 0.2,
  armorWeight: 0.2,
  operatorWeight: 0.2,
} as const;

export type SeedGearCategory = 'weapon' | 'helmet' | 'armor' | 'operator';
export type SeedGearRarity = 'common' | 'rare' | 'epic' | 'legendary';

export interface SeedGearItem {
  id: string;
  category: SeedGearCategory;
  name: string;
  subCategory?: string;
  baseScore: number;
  rarity?: SeedGearRarity;
  weight?: number;
  imageUrl?: string;
  description?: string;
  enabled: boolean;
}

/** 占位数据:正式录入前请替换为真实条目。 */
export const SEED_GEAR_ITEMS: SeedGearItem[] = [
  {
    id: 'weapon_example_placeholder',
    category: 'weapon',
    name: '示例占位武器(请替换为真实数据)',
    baseScore: 50,
    rarity: 'common',
    weight: 1,
    description: '工程骨架占位条目,正式数据请替换并 enabled=true。',
    enabled: false,
  },
  {
    id: 'helmet_example_placeholder',
    category: 'helmet',
    name: '示例占位头盔(请替换为真实数据)',
    baseScore: 50,
    rarity: 'common',
    weight: 1,
    description: '工程骨架占位条目,正式数据请替换并 enabled=true。',
    enabled: false,
  },
  {
    id: 'armor_example_placeholder',
    category: 'armor',
    name: '示例占位护甲(请替换为真实数据)',
    baseScore: 50,
    rarity: 'common',
    weight: 1,
    description: '工程骨架占位条目,正式数据请替换并 enabled=true。',
    enabled: false,
  },
  {
    id: 'operator_example_placeholder',
    category: 'operator',
    name: '示例占位干员(请替换为真实数据)',
    baseScore: 50,
    rarity: 'common',
    weight: 1,
    description: '工程骨架占位条目,正式数据请替换并 enabled=true。',
    enabled: false,
  },
];
