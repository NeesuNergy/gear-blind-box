/**
 * 评分引擎核心实现。
 *
 * 综合评分公式见 docs/03-spec/SCORING-SPEC.md 第 3 节;
 * 评分区间抽取算法(约束传播预筛 + 加权随机 + 拒绝采样 + 兜底策略)见第 4 节;
 * scoreBounds 计算口径见第 3.3 节。
 */
import { GEAR_CATEGORIES } from '@gearblindbox/shared-types';
import type {
  GearCategory,
  GearItem,
  ScoreRange,
  ScoreWeightConfig,
} from '@gearblindbox/shared-types';
import {
  DEFAULT_MAX_RETRY,
  MAX_TOTAL_SCORE,
  MIN_TOTAL_SCORE,
  ROUNDING_TOLERANCE,
} from './constants';
import type { DrawOutcome, GearPools, ScoringEngineOptions } from './types';
import { assertValidScoreWeights } from './validation';

/** 某一槶位在权重配置中对应的系数,见 SCORING-SPEC.md 第 3.1 节公式。 */
function getCategoryWeight(category: GearCategory, weights: ScoreWeightConfig): number {
  switch (category) {
    case 'weapon':
      return weights.weaponWeight;
    case 'helmet':
      return weights.helmetWeight;
    case 'armor':
      return weights.armorWeight;
    case 'operator':
      return weights.operatorWeight;
  }
}

/**
 * 某槶位候选池的最小/最大贡献值,见 SCORING-SPEC.md 4.2 节第一步。
 * 池为空时 Math.min(...[]) === Infinity、Math.max(...[]) === -Infinity,
 * 会自然地让依赖该槶位的其余判断全部不可行,无需额外的空池分支处理。
 */
function getPoolContributionRange(pool: GearItem[], weight: number): { min: number; max: number } {
  const scores = pool.map((item) => item.baseScore);
  return {
    min: weight * Math.min(...scores),
    max: weight * Math.max(...scores),
  };
}

/**
 * 综合评分计算。
 * 公式:totalScore = round(Σ weight_i * item_i.baseScore),见 SCORING-SPEC.md 3.1 节。
 */
export function computeTotalScore(
  items: Record<GearCategory, GearItem>,
  weights: ScoreWeightConfig,
): number {
  const sum = GEAR_CATEGORIES.reduce(
    (acc, category) => acc + getCategoryWeight(category, weights) * items[category].baseScore,
    0,
  );
  return Math.round(sum);
}

/**
 * 当前有效池下理论可达成的综合评分边界,见 SCORING-SPEC.md 3.3 节。
 * 供 GET /api/v1/gear-config 的 scoreBounds 字段使用,不参与抽取时的约束传播计算。
 */
export function computeScoreBounds(
  pools: GearPools,
  weights: ScoreWeightConfig,
): { min: number; max: number } {
  let minSum = 0;
  let maxSum = 0;
  for (const category of GEAR_CATEGORIES) {
    const { min, max } = getPoolContributionRange(
      pools[category],
      getCategoryWeight(category, weights),
    );
    minSum += min;
    maxSum += max;
  }
  return { min: Math.round(minSum), max: Math.round(maxSum) };
}

/**
 * 约束传播预筛:剔除"无论其余槶位如何选择都不可能落入区间"的候选条目。
 * 见 SCORING-SPEC.md 4.2 节第一步。这只是必要条件,不是充分条件。
 */
export function applyConstraintPropagation(
  pools: GearPools,
  weights: ScoreWeightConfig,
  range: Required<ScoreRange>,
): GearPools {
  const contributionRanges = new Map<GearCategory, { min: number; max: number }>();
  for (const category of GEAR_CATEGORIES) {
    contributionRanges.set(
      category,
      getPoolContributionRange(pools[category], getCategoryWeight(category, weights)),
    );
  }

  const filtered = {} as GearPools;
  for (const category of GEAR_CATEGORIES) {
    const weight = getCategoryWeight(category, weights);
    const otherCategories = GEAR_CATEGORIES.filter((c) => c !== category);
    const otherMinSum = otherCategories.reduce((acc, c) => acc + contributionRanges.get(c)!.min, 0);
    const otherMaxSum = otherCategories.reduce((acc, c) => acc + contributionRanges.get(c)!.max, 0);

    filtered[category] = pools[category].filter((item) => {
      const contribution = weight * item.baseScore;
      const bestCaseTotal = contribution + otherMaxSum;
      const worstCaseTotal = contribution + otherMinSum;
      if (bestCaseTotal < range.minScore - ROUNDING_TOLERANCE) return false;
      if (worstCaseTotal > range.maxScore + ROUNDING_TOLERANCE) return false;
      return true;
    });
  }

  return filtered;
}

/** 在单个候选池中按 `weight` 字段(默认 1)做加权随机,返回选中的条目。 */
function pickWeightedItem(pool: GearItem[]): GearItem {
  if (pool.length === 0) {
    throw new Error('pickWeightedItem: 候选池为空,无法抽取,请检查官方配置是否存在启用条目');
  }

  const itemWeights = pool.map((item) => item.weight ?? 1);
  const totalWeight = itemWeights.reduce((acc, w) => acc + w, 0);
  let threshold = Math.random() * totalWeight;

  for (let i = 0; i < pool.length; i += 1) {
    threshold -= itemWeights[i]!;
    if (threshold <= 0) {
      return pool[i]!;
    }
  }
  // 浮点误差兜底,理论上不会触达。
  return pool[pool.length - 1]!;
}

/**
 * 在给定候选池中按 weight 字段做加权随机,每个槶位独立选出一项。
 * 见 SCORING-SPEC.md 4.2 节第二步。
 */
export function weightedRandomPick(pools: GearPools): Record<GearCategory, GearItem> {
  const result = {} as Record<GearCategory, GearItem>;
  for (const category of GEAR_CATEGORIES) {
    result[category] = pickWeightedItem(pools[category]);
  }
  return result;
}

/**
 * 兜底策略:在预筛候选池中做一次确定性搜索,选出使总分最接近区间中点的组合。
 * 见 SCORING-SPEC.md 4.2 节第三步。四个槶位独立枚举,复杂度为各槶位候选数之积,
 * 在 V0.1 的装备池规模下(每槶位数十条量级)可接受;若未来池规模显著增长,
 * 应优化为分治合并(如两两配对后二分查找),当前 MVP 阶段不做提前优化。
 */
function findClosestToMidpoint(
  pools: GearPools,
  weights: ScoreWeightConfig,
  range: Required<ScoreRange>,
): Record<GearCategory, GearItem> {
  const midpoint = (range.minScore + range.maxScore) / 2;
  let best: { items: Record<GearCategory, GearItem>; distance: number } | undefined;

  const search = (index: number, chosen: Partial<Record<GearCategory, GearItem>>): void => {
    if (index === GEAR_CATEGORIES.length) {
      const items = chosen as Record<GearCategory, GearItem>;
      const distance = Math.abs(computeTotalScore(items, weights) - midpoint);
      if (!best || distance < best.distance) {
        best = { items, distance };
      }
      return;
    }
    const category = GEAR_CATEGORIES[index]!;
    for (const item of pools[category]) {
      search(index + 1, { ...chosen, [category]: item });
    }
  };

  search(0, {});

  if (!best) {
    throw new Error('findClosestToMidpoint: 预筛后的候选池为空,不应进入兜底搜索');
  }
  return best.items;
}

/**
 * 抽取主流程入口:无区间约束时直接加权随机;有区间约束时执行
 * "预筛 → 加权随机 → 拒绝采样重试 → 兜底策略"完整链路。
 * 见 SCORING-SPEC.md 4.3/4.4 节。
 */
export function drawCombination(
  pools: GearPools,
  weights: ScoreWeightConfig,
  range?: ScoreRange,
  options?: ScoringEngineOptions,
): DrawOutcome {
  assertValidScoreWeights(weights);

  const normalizedRange: Required<ScoreRange> = {
    minScore: range?.minScore ?? MIN_TOTAL_SCORE,
    maxScore: range?.maxScore ?? MAX_TOTAL_SCORE,
  };

  const isFullRange =
    normalizedRange.minScore <= MIN_TOTAL_SCORE && normalizedRange.maxScore >= MAX_TOTAL_SCORE;
  if (isFullRange) {
    const items = weightedRandomPick(pools);
    return {
      feasible: true,
      items,
      totalScore: computeTotalScore(items, weights),
      usedFallback: false,
    };
  }

  const filteredPools = applyConstraintPropagation(pools, weights, normalizedRange);
  const isAnyPoolEmpty = GEAR_CATEGORIES.some((category) => filteredPools[category].length === 0);
  if (isAnyPoolEmpty) {
    return { feasible: false };
  }

  const maxRetry = options?.maxRetry ?? DEFAULT_MAX_RETRY;
  for (let attempt = 0; attempt < maxRetry; attempt += 1) {
    const candidate = weightedRandomPick(filteredPools);
    const totalScore = computeTotalScore(candidate, weights);
    if (totalScore >= normalizedRange.minScore && totalScore <= normalizedRange.maxScore) {
      return { feasible: true, items: candidate, totalScore, usedFallback: false };
    }
  }

  const fallbackItems = findClosestToMidpoint(filteredPools, weights, normalizedRange);
  return {
    feasible: true,
    items: fallbackItems,
    totalScore: computeTotalScore(fallbackItems, weights),
    usedFallback: true,
  };
}
