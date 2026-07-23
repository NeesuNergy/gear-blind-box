import { InternalServerErrorException } from '@nestjs/common';
import type { GearItem as PrismaGearItem } from '@prisma/client';
import { GearConfigService } from './gear-config.service';
import type { PrismaService } from '../prisma/prisma.service';

function makeRow(
  overrides: Partial<PrismaGearItem> & Pick<PrismaGearItem, 'id' | 'category' | 'baseScore'>,
): PrismaGearItem {
  return {
    name: overrides.id,
    subCategory: null,
    rarity: null,
    weight: 1,
    imageUrl: null,
    description: null,
    enabled: true,
    createdAt: new Date('2026-07-01T00:00:00Z'),
    updatedAt: new Date('2026-07-01T00:00:00Z'),
    ...overrides,
  };
}

const VALID_ROWS: PrismaGearItem[] = [
  makeRow({ id: 'weapon_a', category: 'weapon', baseScore: 60, rarity: 'epic' }),
  makeRow({ id: 'helmet_a', category: 'helmet', baseScore: 50 }),
  makeRow({ id: 'armor_a', category: 'armor', baseScore: 40 }),
  makeRow({ id: 'operator_a', category: 'operator', baseScore: 70 }),
];

const VALID_REVISION = { id: 'official', versionTag: '2026.07', updatedAt: new Date() };
const VALID_WEIGHTS = {
  id: 'official',
  weaponWeight: 0.4,
  helmetWeight: 0.2,
  armorWeight: 0.2,
  operatorWeight: 0.2,
  updatedAt: new Date(),
};

function createPrismaMock(overrides?: {
  revision?: typeof VALID_REVISION | null;
  weights?: typeof VALID_WEIGHTS | null;
  items?: PrismaGearItem[];
}): PrismaService {
  // 注意:不能用 `??` 取默认值,因为 `null` 本身是这里要测试的合法覆盖值,
  // `null ?? DEFAULT` 会错误地退回默认值,必须用 `in` 精确区分"未传"与"显式传 null"。
  const revision = overrides && 'revision' in overrides ? overrides.revision : VALID_REVISION;
  const weights = overrides && 'weights' in overrides ? overrides.weights : VALID_WEIGHTS;
  const items = overrides?.items ?? VALID_ROWS;

  return {
    configRevision: {
      findUnique: jest.fn().mockResolvedValue(revision),
    },
    scoreWeightConfig: {
      findUnique: jest.fn().mockResolvedValue(weights),
    },
    gearItem: {
      findMany: jest.fn().mockResolvedValue(items),
    },
  } as unknown as PrismaService;
}

describe('GearConfigService', () => {
  describe('getEffectivePool', () => {
    it('按 category 分组,并把官方 versionTag 注入每个 GearItem', async () => {
      const service = new GearConfigService(createPrismaMock());
      const { pools, weights, versionTag } = await service.getEffectivePool();

      expect(versionTag).toBe('2026.07');
      expect(pools.weapon).toHaveLength(1);
      expect(pools.weapon[0]).toMatchObject({
        id: 'weapon_a',
        baseScore: 60,
        versionTag: '2026.07',
      });
      expect(weights).toEqual({
        versionTag: '2026.07',
        weaponWeight: 0.4,
        helmetWeight: 0.2,
        armorWeight: 0.2,
        operatorWeight: 0.2,
      });
    });

    it('未启用(enabled=false)的条目不进入有效池', async () => {
      const items = [
        ...VALID_ROWS,
        makeRow({ id: 'weapon_disabled', category: 'weapon', baseScore: 90, enabled: false }),
      ];
      // findMany 已按 where: { enabled: true } 查询,骨架测试模拟数据库已过滤的结果
      const service = new GearConfigService(
        createPrismaMock({ items: items.filter((item) => item.enabled) }),
      );
      const { pools } = await service.getEffectivePool();
      expect(pools.weapon.map((item) => item.id)).toEqual(['weapon_a']);
    });

    it('缺少 config_revisions 官方记录时抛出 InternalServerErrorException', async () => {
      const service = new GearConfigService(createPrismaMock({ revision: null }));
      await expect(service.getEffectivePool()).rejects.toThrow(InternalServerErrorException);
    });

    it('缺少 score_weight_configs 官方记录时抛出 InternalServerErrorException', async () => {
      const service = new GearConfigService(createPrismaMock({ weights: null }));
      await expect(service.getEffectivePool()).rejects.toThrow(InternalServerErrorException);
    });

    it('某个 category 下没有任何启用条目时抛出 InternalServerErrorException', async () => {
      const service = new GearConfigService(
        createPrismaMock({ items: VALID_ROWS.filter((item) => item.category !== 'operator') }),
      );
      await expect(service.getEffectivePool()).rejects.toThrow(InternalServerErrorException);
    });

    it('category 字段不是合法枚举值时抛出 InternalServerErrorException', async () => {
      const items = [
        ...VALID_ROWS.slice(1),
        makeRow({ id: 'bad_item', category: 'shield', baseScore: 50 }),
      ];
      const service = new GearConfigService(createPrismaMock({ items }));
      await expect(service.getEffectivePool()).rejects.toThrow(InternalServerErrorException);
    });
  });

  describe('getCurrentConfig', () => {
    it('返回按 API-SPEC.md 3.1 节契约组装的 snapshot,含正确的 scoreBounds', async () => {
      const service = new GearConfigService(createPrismaMock());
      const snapshot = await service.getCurrentConfig();

      expect(snapshot.configVersion).toBe('2026.07');
      expect(snapshot.items.weapons.map((i) => i.id)).toEqual(['weapon_a']);
      expect(snapshot.items.helmets.map((i) => i.id)).toEqual(['helmet_a']);
      expect(snapshot.items.armors.map((i) => i.id)).toEqual(['armor_a']);
      expect(snapshot.items.operators.map((i) => i.id)).toEqual(['operator_a']);
      // 每个槶位仅有一个条目时,min=max=该条目贡献值之和
      // 0.4*60 + 0.2*50 + 0.2*40 + 0.2*70 = 24+10+8+14 = 56
      expect(snapshot.scoreBounds).toEqual({ min: 56, max: 56 });
    });
  });
});
