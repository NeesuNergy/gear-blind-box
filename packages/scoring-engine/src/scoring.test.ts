import { describe, expect, it } from 'vitest';
import { computeTotalScore, drawCombination, NotImplementedError } from './scoring';

/**
 * 骨架阶段测试:仅验证脚手架本身(未实现前应显式抛错,而不是静默返回错误结果)。
 * 待实现评分引擎业务逻辑后,请删除下方 sanity 测试,并将 it.todo 列表逐一实现为真实用例。
 * 完整测试场景清单见 docs/03-spec/SCORING-SPEC.md 第 5 节。
 */
describe('scoring-engine(骨架阶段 sanity check)', () => {
  it('computeTotalScore 在未实现前应抛出 NotImplementedError', () => {
    expect(() =>
      // @ts-expect-error 骨架阶段的占位调用,入参类型在真实实现中需要严格满足契约
      computeTotalScore({}, {}),
    ).toThrow(NotImplementedError);
  });

  it('drawCombination 在未实现前应抛出 NotImplementedError', () => {
    expect(() =>
      // @ts-expect-error 骨架阶段的占位调用,入参类型在真实实现中需要严格满足契约
      drawCombination({}, {}),
    ).toThrow(NotImplementedError);
  });
});

describe.todo('computeTotalScore(SCORING-SPEC.md 第 5 节场景 1)', () => {
  it.todo('给定固定的四项分数与权重,综合评分计算结果符合公式');
});

describe.todo('配置校验(SCORING-SPEC.md 第 5 节场景 2)', () => {
  it.todo('权重之和不为 1 时,配置加载阶段应拒绝该配置');
});

describe.todo('drawCombination · 全区间(SCORING-SPEC.md 第 5 节场景 3)', () => {
  it.todo('无 minScore/maxScore 时不触发预筛与重试逻辑,行为等价于纯加权随机');
});

describe.todo('drawCombination · 可达成区间(SCORING-SPEC.md 第 5 节场景 4)', () => {
  it.todo('设定一个明显可达成的区间,抽取结果的分数必须落在区间内');
});

describe.todo('drawCombination · 不可达成区间(SCORING-SPEC.md 第 5 节场景 5)', () => {
  it.todo('设定一个当前配置下不可达成的区间,返回 feasible: false,且不发生死循环或超时');
});

describe.todo('drawCombination · 极窄区间兜底(SCORING-SPEC.md 第 5 节场景 6)', () => {
  it.todo('极窄但理论可达成的区间,重试耗尽后仍返回落在区间内的结果(usedFallback: true)');
});

describe.todo('drawCombination · 随机性(SCORING-SPEC.md 第 5 节场景 7)', () => {
  it.todo('同一输入多次调用,结果具备随机性(候选池足够大时,N 次结果去重后种类数 > 1)');
});
