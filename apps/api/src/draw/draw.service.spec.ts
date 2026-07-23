import { HttpStatus } from '@nestjs/common';
import type { GearItem, ScoreWeightConfig } from '@gearblindbox/shared-types';
import type { GearPools } from '@gearblindbox/scoring-engine';
import { ApiBusinessException } from '../common/filters/http-exception.filter';
import type { GearConfigService } from '../gear-config/gear-config.service';
import type { PrismaService } from '../prisma/prisma.service';
import { DrawService } from './draw.service';
import type { DrawRequestDto } from './dto/draw-request.dto';

function makeItem(
  overrides: Partial<GearItem> & Pick<GearItem, 'id' | 'category' | 'baseScore'>,
): GearItem {
  return {
    name: overrides.id,
    versionTag: '2026.07',
    enabled: true,
    weight: 1,
    ...overrides,
  };
}

// 每个槶位仅一个候选,确保抽取结果确定性(无需处理随机性),便于断言。
const POOLS: GearPools = {
  weapon: [makeItem({ id: 'weapon_a', category: 'weapon', baseScore: 60 })],
  helmet: [makeItem({ id: 'helmet_a', category: 'helmet', baseScore: 50 })],
  armor: [makeItem({ id: 'armor_a', category: 'armor', baseScore: 40 })],
  operator: [makeItem({ id: 'operator_a', category: 'operator', baseScore: 70 })],
};

const WEIGHTS: ScoreWeightConfig = {
  versionTag: '2026.07',
  weaponWeight: 0.4,
  helmetWeight: 0.2,
  armorWeight: 0.2,
  operatorWeight: 0.2,
};

// 0.4*60 + 0.2*50 + 0.2*40 + 0.2*70 = 24+10+8+14 = 56
const EXPECTED_TOTAL_SCORE = 56;

function createGearConfigServiceMock(): GearConfigService {
  return {
    getEffectivePool: jest
      .fn()
      .mockResolvedValue({ pools: POOLS, weights: WEIGHTS, versionTag: '2026.07' }),
  } as unknown as GearConfigService;
}

/**
 * 返回 mock 函数本身(而非挂在类型化对象上的属性),避免直接对 `prisma.drawRecord.create`
 * 做属性访问触发 @typescript-eslint/unbound-method(该规则假设被访问的方法可能依赖 `this`)。
 */
function createPrismaMock(): { prisma: PrismaService; createDrawRecord: jest.Mock } {
  const createDrawRecord = jest.fn().mockResolvedValue({});
  const prisma = { drawRecord: { create: createDrawRecord } } as unknown as PrismaService;
  return { prisma, createDrawRecord };
}

describe('DrawService', () => {
  it('无区间约束时返回组合结果,且落库 DrawRecord(selectedMinScore/MaxScore 为 null)', async () => {
    const gearConfigService = createGearConfigServiceMock();
    const { prisma, createDrawRecord } = createPrismaMock();
    const service = new DrawService(gearConfigService, prisma);
    const dto: DrawRequestDto = { sessionId: 'session-1' };

    const result = await service.draw(dto, 'anon-1');

    expect(result).toEqual({
      combination: {
        weapon: { id: 'weapon_a', name: 'weapon_a', score: 60 },
        helmet: { id: 'helmet_a', name: 'helmet_a', score: 50 },
        armor: { id: 'armor_a', name: 'armor_a', score: 40 },
        operator: { id: 'operator_a', name: 'operator_a', score: 70 },
      },
      totalScore: EXPECTED_TOTAL_SCORE,
      configVersion: '2026.07',
      usedFallback: false,
    });

    expect(createDrawRecord).toHaveBeenCalledWith({
      data: expect.objectContaining({
        anonymousId: 'anon-1',
        sessionId: 'session-1',
        configVersion: '2026.07',
        totalScore: EXPECTED_TOTAL_SCORE,
        weaponScore: 60,
        helmetScore: 50,
        armorScore: 40,
        operatorScore: 70,
        selectedMinScore: null,
        selectedMaxScore: null,
      }),
    });
  });

  it('设定的区间可达成时,落库记录会保留用户原始的 minScore/maxScore', async () => {
    const gearConfigService = createGearConfigServiceMock();
    const { prisma, createDrawRecord } = createPrismaMock();
    const service = new DrawService(gearConfigService, prisma);
    const dto: DrawRequestDto = { sessionId: 'session-1', minScore: 40, maxScore: 60 };

    await service.draw(dto, 'anon-1');

    expect(createDrawRecord).toHaveBeenCalledWith({
      data: expect.objectContaining({ selectedMinScore: 40, selectedMaxScore: 60 }),
    });
  });

  it('minScore > maxScore 时抛出 INVALID_SCORE_RANGE(400)', async () => {
    const service = new DrawService(createGearConfigServiceMock(), createPrismaMock().prisma);
    const dto: DrawRequestDto = { sessionId: 'session-1', minScore: 80, maxScore: 20 };

    expect.assertions(3);
    try {
      await service.draw(dto, 'anon-1');
    } catch (error) {
      expect(error).toBeInstanceOf(ApiBusinessException);
      const exception = error as ApiBusinessException;
      expect(exception.code).toBe('INVALID_SCORE_RANGE');
      expect(exception.getStatus()).toBe(HttpStatus.BAD_REQUEST);
    }
  });

  it('区间在当前配置下不可达成时抛出 SCORE_RANGE_INFEASIBLE(200,业务级失败)', async () => {
    const service = new DrawService(createGearConfigServiceMock(), createPrismaMock().prisma);
    // 当前 fixture 池的最大可能综合分为 56,99-100 区间必然不可达成。
    const dto: DrawRequestDto = { sessionId: 'session-1', minScore: 99, maxScore: 100 };

    expect.assertions(3);
    try {
      await service.draw(dto, 'anon-1');
    } catch (error) {
      expect(error).toBeInstanceOf(ApiBusinessException);
      const exception = error as ApiBusinessException;
      expect(exception.code).toBe('SCORE_RANGE_INFEASIBLE');
      expect(exception.getStatus()).toBe(HttpStatus.OK);
    }
  });
});
