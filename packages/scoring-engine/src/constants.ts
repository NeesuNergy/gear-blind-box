/**
 * 评分引擎业务常量。禁止将这些数值散落在业务逻辑中(见 docs/04-engineering/CODING-STANDARDS.md 第1节)。
 */

/** 区间抽取拒绝采样的最大重试次数,见 docs/03-spec/SCORING-SPEC.md 4.2 节第二步(建议值 50)。 */
export const DEFAULT_MAX_RETRY = 50;

/**
 * 约束传播预筛的四舍五入容差。
 * SCORING-SPEC.md 4.2 节的预筛判定基于未四舍五入的贡献值总和,而最终 totalScore 会四舍五入,
 * 边界上的候选条目可能因为舍入方向而被误剔除,故预筛比较时放宽 0.5(四舍五入的最大偏移量)。
 */
export const ROUNDING_TOLERANCE = 0.5;

/** 综合评分标度下界,见 docs/03-spec/SCORING-SPEC.md 第 2.1 节。 */
export const MIN_TOTAL_SCORE = 0;

/** 综合评分标度上界,见 docs/03-spec/SCORING-SPEC.md 第 2.1 节。 */
export const MAX_TOTAL_SCORE = 100;
