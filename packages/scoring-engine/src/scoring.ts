/**
 * 评分引擎核心接口(骨架阶段)。
 *
 * 本文件仅定义函数签名与 TODO,具体实现(评分公式、约束传播预筛、
 * 加权随机、拒绝采样与兜底策略)按 docs/03-spec/SCORING-SPEC.md 第 3/4 节完成。
 * 在业务逻辑实现前,所有函数调用会抛出 NotImplementedError,避免被误当作可用实现接入。
 */
import type {
  GearCategory,
  GearItem,
  ScoreRange,
  ScoreWeightConfig,
} from '@gearblindbox/shared-types';
import type { DrawOutcome, GearPools, ScoringEngineOptions } from './types';

export class NotImplementedError extends Error {
  constructor(fnName: string, specRef: string) {
    super(`${fnName} 尚未实现,请参考 ${specRef} 完成业务逻辑。`);
    this.name = 'NotImplementedError';
  }
}

/**
 * 综合评分计算。
 * 公式:totalScore = round(Σ weight_i * item_i.baseScore),见 SCORING-SPEC.md 3.1 节。
 */
export function computeTotalScore(
  _items: Record<GearCategory, GearItem>,
  _weights: ScoreWeightConfig,
): number {
  throw new NotImplementedError('computeTotalScore', 'docs/03-spec/SCORING-SPEC.md 第 3.1 节');
}

/**
 * 约束传播预筛:剔除"无论其余槶位如何选择都不可能落入区间"的候选条目。
 * 见 SCORING-SPEC.md 4.2 节第一步。
 */
export function applyConstraintPropagation(
  _pools: GearPools,
  _weights: ScoreWeightConfig,
  _range: Required<ScoreRange>,
): GearPools {
  throw new NotImplementedError(
    'applyConstraintPropagation',
    'docs/03-spec/SCORING-SPEC.md 第 4.2 节',
  );
}

/**
 * 在给定候选池中按 weight 字段做加权随机,每个槶位独立选出一项。
 * 见 SCORING-SPEC.md 4.2 节第二步。
 */
export function weightedRandomPick(_pools: GearPools): Record<GearCategory, GearItem> {
  throw new NotImplementedError('weightedRandomPick', 'docs/03-spec/SCORING-SPEC.md 第 4.2 节');
}

/**
 * 抽取主流程入口:无区间约束时直接加权随机;有区间约束时执行
 * "预筛 → 加权随机 → 拒绝采样重试 → 兜底策略"完整链路。
 * 见 SCORING-SPEC.md 4.4 节伪代码。
 */
export function drawCombination(
  _pools: GearPools,
  _weights: ScoreWeightConfig,
  _range?: ScoreRange,
  _options?: ScoringEngineOptions,
): DrawOutcome {
  throw new NotImplementedError('drawCombination', 'docs/03-spec/SCORING-SPEC.md 第 4.4 节');
}
