/**
 * 评分引擎的输入/输出类型契约。
 * 具体计算逻辑见 docs/03-spec/SCORING-SPEC.md,本文件仅定义"输入什么、输出什么"的形状。
 */
import type {
  GearCategory,
  GearItem,
  ScoreRange,
  ScoreWeightConfig,
} from '@gearblindbox/shared-types';

/** 每个槶位的候选池,对应 SCORING-SPEC.md 4.1 节的问题形式化描述。 */
export type GearPools = Record<GearCategory, GearItem[]>;

/** 一次抽取的内部计算结果(未做展示层格式化)。 */
export interface DrawOutcome {
  feasible: boolean;
  items?: Record<GearCategory, GearItem>;
  totalScore?: number;
  usedFallback?: boolean;
}

export interface ScoringEngineOptions {
  /** 区间抽取的最大重试次数,见 SCORING-SPEC.md 4.2 节,默认建议值 50。 */
  maxRetry?: number;
}

export type { GearItem, ScoreRange, ScoreWeightConfig };
