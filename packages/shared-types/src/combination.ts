/**
 * 对应 docs/03-spec/SCORING-SPEC.md 与 docs/03-spec/API-SPEC.md 3.2 节。
 * 仅为类型契约,不包含评分公式或抽取算法的具体实现。
 */
import type { GearCategory } from './gear';

/** 用户设定的评分区间,均为可选(不传即全区间随机)。 */
export interface ScoreRange {
  minScore?: number;
  maxScore?: number;
}

/** 抽取结果中单个槶位的展示数据。 */
export interface CombinationItemResult {
  id: string;
  name: string;
  score: number;
  imageUrl: string;
}

export type Combination = Record<GearCategory, CombinationItemResult>;

/** 一次抽取的完整结果,对应 API-SPEC.md 3.2 节成功响应结构。 */
export interface DrawResult {
  combination: Combination;
  totalScore: number;
  configVersion: string;
  usedFallback: boolean;
}
