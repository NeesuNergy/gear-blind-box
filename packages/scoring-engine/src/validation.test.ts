import { describe, expect, it } from 'vitest';
import type { ScoreWeightConfig } from '@gearblindbox/shared-types';
import { assertValidScoreWeights } from './validation';

/** 对应 docs/03-spec/SCORING-SPEC.md 第 5 节场景 2:权重之和不为 1 时应拒绝该配置。 */
describe('assertValidScoreWeights', () => {
  const validWeights: ScoreWeightConfig = {
    versionTag: '2026.07',
    weaponWeight: 0.4,
    helmetWeight: 0.2,
    armorWeight: 0.2,
    operatorWeight: 0.2,
  };

  it('权重之和为 1 时不抛错', () => {
    expect(() => assertValidScoreWeights(validWeights)).not.toThrow();
  });

  it('权重之和在容差范围内(±0.001)时不抛错', () => {
    expect(() =>
      assertValidScoreWeights({ ...validWeights, operatorWeight: 0.2005 }),
    ).not.toThrow();
  });

  it('权重之和不为 1 时应拒绝该配置', () => {
    expect(() => assertValidScoreWeights({ ...validWeights, operatorWeight: 0.5 })).toThrow(
      /权重之和/,
    );
  });

  it('单项权重超出 [0,1] 区间时应拒绝', () => {
    expect(() =>
      assertValidScoreWeights({ ...validWeights, weaponWeight: 1.2, operatorWeight: 0 }),
    ).toThrow(/超出/);
  });
});
