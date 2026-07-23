import { describe, expect, it } from 'vitest';
import type { GearItem, ScoreWeightConfig } from '@gearblindbox/shared-types';
import {
  applyConstraintPropagation,
  computeScoreBounds,
  computeTotalScore,
  drawCombination,
  weightedRandomPick,
} from './scoring';
import type { GearPools } from './types';

/**
 * 测试场景清单对应 docs/03-spec/SCORING-SPEC.md 第 5 节。
 * 场景 2(权重之和校验)见 validation.test.ts。
 */

const WEIGHTS: ScoreWeightConfig = {
  versionTag: '2026.07',
  weaponWeight: 0.4,
  helmetWeight: 0.2,
  armorWeight: 0.2,
  operatorWeight: 0.2,
};

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

/** 每个槶位候选数较多(baseScore 覆盖 0-100 全区间),用于验证区间抽取算法。 */
function makeWidePools(): GearPools {
  const scores = [5, 15, 25, 35, 45, 55, 65, 75, 85, 95];
  return {
    weapon: scores.map((score, i) =>
      makeItem({ id: `weapon_${i}`, category: 'weapon', baseScore: score }),
    ),
    helmet: scores.map((score, i) =>
      makeItem({ id: `helmet_${i}`, category: 'helmet', baseScore: score }),
    ),
    armor: scores.map((score, i) =>
      makeItem({ id: `armor_${i}`, category: 'armor', baseScore: score }),
    ),
    operator: scores.map((score, i) =>
      makeItem({ id: `operator_${i}`, category: 'operator', baseScore: score }),
    ),
  };
}

describe('computeTotalScore(SCORING-SPEC.md 第 5 节场景 1)', () => {
  it('给定固定的四项分数与权重,综合评分计算结果符合公式', () => {
    const items = {
      weapon: makeItem({ id: 'weapon_ak12', category: 'weapon', baseScore: 65 }),
      helmet: makeItem({ id: 'helmet_lv4', category: 'helmet', baseScore: 80 }),
      armor: makeItem({ id: 'armor_lv5', category: 'armor', baseScore: 88 }),
      operator: makeItem({ id: 'operator_falcon', category: 'operator', baseScore: 70 }),
    };

    // 0.4*65 + 0.2*80 + 0.2*88 + 0.2*70 = 26 + 16 + 17.6 + 14 = 73.6 -> round = 74
    expect(computeTotalScore(items, WEIGHTS)).toBe(74);
  });

  it('计算结果始终四舍五入为整数', () => {
    const items = {
      weapon: makeItem({ id: 'weapon_a', category: 'weapon', baseScore: 51 }),
      helmet: makeItem({ id: 'helmet_a', category: 'helmet', baseScore: 51 }),
      armor: makeItem({ id: 'armor_a', category: 'armor', baseScore: 51 }),
      operator: makeItem({ id: 'operator_a', category: 'operator', baseScore: 51 }),
    };
    expect(computeTotalScore(items, WEIGHTS)).toBe(51);
    expect(Number.isInteger(computeTotalScore(items, WEIGHTS))).toBe(true);
  });
});

describe('drawCombination · 全区间(SCORING-SPEC.md 第 5 节场景 3)', () => {
  it('无 minScore/maxScore 时不触发预筛与重试逻辑,行为等价于纯加权随机', () => {
    const pools = makeWidePools();
    const outcome = drawCombination(pools, WEIGHTS);

    expect(outcome.feasible).toBe(true);
    expect(outcome.usedFallback).toBe(false);
    expect(outcome.items).toBeDefined();
    expect(outcome.totalScore).toBeGreaterThanOrEqual(0);
    expect(outcome.totalScore).toBeLessThanOrEqual(100);
  });

  it('区间覆盖 0-100 时等价于全区间场景', () => {
    const pools = makeWidePools();
    const outcome = drawCombination(pools, WEIGHTS, { minScore: 0, maxScore: 100 });

    expect(outcome.feasible).toBe(true);
    expect(outcome.usedFallback).toBe(false);
  });
});

describe('drawCombination · 可达成区间(SCORING-SPEC.md 第 5 节场景 4)', () => {
  it('设定一个明显可达成的区间,抽取结果的分数必须落在区间内', () => {
    const pools = makeWidePools();

    for (let i = 0; i < 20; i += 1) {
      const outcome = drawCombination(pools, WEIGHTS, { minScore: 40, maxScore: 60 });
      expect(outcome.feasible).toBe(true);
      expect(outcome.totalScore).toBeGreaterThanOrEqual(40);
      expect(outcome.totalScore).toBeLessThanOrEqual(60);
    }
  });

  it('只传 minScore 时,另一端取 100(与 API-SPEC.md 3.2 节约定一致)', () => {
    const pools = makeWidePools();
    const outcome = drawCombination(pools, WEIGHTS, { minScore: 90 });

    expect(outcome.feasible).toBe(true);
    expect(outcome.totalScore).toBeGreaterThanOrEqual(90);
  });
});

describe('drawCombination · 不可达成区间(SCORING-SPEC.md 第 5 节场景 5)', () => {
  it('设定一个当前配置下不可达成的区间,返回 feasible: false,且不发生死循环或超时', () => {
    const pools = makeWidePools();
    // 池内四项分数上限为 95,加权求和后综合分不可能达到 99-100。
    const start = Date.now();
    const outcome = drawCombination(pools, WEIGHTS, { minScore: 99, maxScore: 100 });
    const elapsedMs = Date.now() - start;

    expect(outcome.feasible).toBe(false);
    expect(elapsedMs).toBeLessThan(1000);
  });
});

describe('drawCombination · 极窄区间兜底(SCORING-SPEC.md 第 5 节场景 6)', () => {
  it('极窄但理论可达成的区间,重试耗尽后仍返回落在区间内的结果', () => {
    // 每个槶位只有两个候选(分数差距较大),使随机命中窄区间的概率极低,
    // 迫使算法进入 findClosestToMidpoint 兜底路径,但该区间本身理论可达成。
    const pools: GearPools = {
      weapon: [
        makeItem({ id: 'weapon_low', category: 'weapon', baseScore: 10 }),
        makeItem({ id: 'weapon_high', category: 'weapon', baseScore: 90 }),
      ],
      helmet: [
        makeItem({ id: 'helmet_low', category: 'helmet', baseScore: 10 }),
        makeItem({ id: 'helmet_high', category: 'helmet', baseScore: 90 }),
      ],
      armor: [
        makeItem({ id: 'armor_low', category: 'armor', baseScore: 10 }),
        makeItem({ id: 'armor_high', category: 'armor', baseScore: 90 }),
      ],
      operator: [
        makeItem({ id: 'operator_low', category: 'operator', baseScore: 10 }),
        makeItem({ id: 'operator_high', category: 'operator', baseScore: 90 }),
      ],
    };

    // weapon=90(0.4) + helmet=10(0.2) + armor=10(0.2) + operator=10(0.2) = 36+2+2+2=42
    const outcome = drawCombination(
      pools,
      WEIGHTS,
      { minScore: 42, maxScore: 42 },
      { maxRetry: 1 },
    );

    expect(outcome.feasible).toBe(true);
    expect(outcome.totalScore).toBe(42);
  });
});

describe('drawCombination · 随机性(SCORING-SPEC.md 第 5 节场景 7)', () => {
  it('同一输入多次调用,结果具备随机性(候选池足够大时,N 次结果去重后种类数 > 1)', () => {
    const pools = makeWidePools();
    const results = new Set<string>();

    for (let i = 0; i < 30; i += 1) {
      const outcome = drawCombination(pools, WEIGHTS);
      const items = outcome.items!;
      results.add(`${items.weapon.id}|${items.helmet.id}|${items.armor.id}|${items.operator.id}`);
    }

    expect(results.size).toBeGreaterThan(1);
  });
});

describe('applyConstraintPropagation', () => {
  it('剔除无论其余槶位如何选择都不可能落入区间的候选条目', () => {
    const pools = makeWidePools();
    const filtered = applyConstraintPropagation(pools, WEIGHTS, { minScore: 90, maxScore: 100 });

    // weapon 权重最高(0.4),分数为 5 的武器最大贡献 0.4*5=2,
    // 其余三槶位即使都取满分 95,最大总分也只有 2+0.2*95*3=59,远不足 90,应被剔除。
    expect(filtered.weapon.some((item) => item.baseScore === 5)).toBe(false);
    // 分数为 95 的武器仍应保留(有可能凑出高分组合)。
    expect(filtered.weapon.some((item) => item.baseScore === 95)).toBe(true);
  });

  it('区间在配置下完全不可达成时,预筛后至少一个槶位候选池为空', () => {
    const pools = makeWidePools();
    const filtered = applyConstraintPropagation(pools, WEIGHTS, { minScore: 99, maxScore: 100 });

    const hasEmptyPool = Object.values(filtered).some((pool) => pool.length === 0);
    expect(hasEmptyPool).toBe(true);
  });
});

describe('computeScoreBounds(SCORING-SPEC.md 第 3.3 节)', () => {
  it('返回当前有效池下理论可达成的最小/最大综合评分', () => {
    const pools = makeWidePools();
    const bounds = computeScoreBounds(pools, WEIGHTS);

    // min: 0.4*5 + 0.2*5 + 0.2*5 + 0.2*5 = 5
    // max: 0.4*95 + 0.2*95 + 0.2*95 + 0.2*95 = 95
    expect(bounds).toEqual({ min: 5, max: 95 });
  });
});

describe('weightedRandomPick', () => {
  it('每个槶位都返回该槶位候选池内的条目', () => {
    const pools = makeWidePools();
    const picked = weightedRandomPick(pools);

    expect(pools.weapon).toContainEqual(picked.weapon);
    expect(pools.helmet).toContainEqual(picked.helmet);
    expect(pools.armor).toContainEqual(picked.armor);
    expect(pools.operator).toContainEqual(picked.operator);
  });

  it('候选池为空时抛出明确错误,而不是静默返回 undefined', () => {
    const pools = makeWidePools();
    pools.weapon = [];
    expect(() => weightedRandomPick(pools)).toThrow(/候选池为空/);
  });
});
