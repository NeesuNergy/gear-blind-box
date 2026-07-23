/**
 * 配置数据的运行时约束校验。
 * 对应 docs/03-spec/CONFIG-SCHEMA.md 第 2.2 节权重约束,以及
 * docs/01-prd/PRD.md 5.5 节"配置数据在被服务用于抽取前必须经过...运行时加载校验"的要求。
 * CI/seed 阶段的静态校验见 scripts/validate-game-config.ts,二者共享同一容差常量。
 */
import type { ScoreWeightConfig } from '@gearblindbox/shared-types';

/** 权重之和允许的误差,见 docs/03-spec/CONFIG-SCHEMA.md 第 2.2 节。 */
export const WEIGHT_SUM_TOLERANCE = 0.001;

/** 单项权重的合法区间,见 docs/03-spec/CONFIG-SCHEMA.md 第 2.2 节。 */
export const WEIGHT_MIN = 0;
export const WEIGHT_MAX = 1;

/**
 * 校验评分权重配置是否满足"四项之和为 1(±0.001),且每项在 [0,1]"的约束。
 * 校验失败时抛错,调用方(GearConfigService 等)不得把非法配置当作有效配置使用。
 */
export function assertValidScoreWeights(weights: ScoreWeightConfig): void {
  const { weaponWeight, helmetWeight, armorWeight, operatorWeight } = weights;
  for (const [name, value] of Object.entries({
    weaponWeight,
    helmetWeight,
    armorWeight,
    operatorWeight,
  })) {
    if (value < WEIGHT_MIN || value > WEIGHT_MAX) {
      throw new Error(
        `ScoreWeightConfig.${name}=${value} 超出 [${WEIGHT_MIN}, ${WEIGHT_MAX}] 区间,见 docs/03-spec/CONFIG-SCHEMA.md 第 2.2 节`,
      );
    }
  }

  const sum = weaponWeight + helmetWeight + armorWeight + operatorWeight;
  if (Math.abs(sum - 1) > WEIGHT_SUM_TOLERANCE) {
    throw new Error(
      `ScoreWeightConfig 四项权重之和为 ${sum},应为 1(允许误差 ±${WEIGHT_SUM_TOLERANCE}),见 docs/03-spec/CONFIG-SCHEMA.md 第 2.2 节`,
    );
  }
}
