# 评分系统规范

> 版本:v0.1 最后更新:2026-07-21
> 本文件是项目**核心业务逻辑**的唯一规范来源。`packages/scoring-engine` 的实现必须与本文件严格一致,任何公式调整必须先改本文件并更新变更记录。

## 1. 设计目标

1. 每一次抽取结果都有一个直观的综合评分(0-100),帮助玩家快速理解"这套装备强不强"。
2. 评分公式必须**可配置**,权重与单项分数都来自配置文件,不写死在代码里,以应对游戏版本更新带来的强度变化。
3. 支持"用户先设定评分区间,再抽取"这一逆向约束问题,且要在有限时间内给出结果或明确的失败反馈,不能无限循环。

## 2. 单项评分(Item Score)

### 2.1 分数标度

- 所有单项评分统一采用 **0-100 的整数标度**,由配置维护者在配置文件中直接赋值(`baseScore` 字段,见 `DATA-MODEL.md`)。
- 分数含义参考(供维护者打分时对齐口径,而非代码强制校验):
  - 0-20:明显弱势/冷门选择
  - 21-40:低于平均强度
  - 41-60:中规中矩,常规选择
  - 61-80:强势,版本内热门
  - 81-100:版本答案级别的顶级强度
- 每类装备(武器/头盔/护甲/干员)各自独立评分,**不做跨类别的标度对齐要求**(例如"武器 80 分"与"干员 80 分"不需要代表同等的游戏内影响力,只需保证同一类别内部的相对排序合理)。跨类别的影响力差异通过第 3 节的权重系数体现。

### 2.2 版本更新时的调分原则

- 游戏版本更新导致某装备增强/削弱时,只调整该装备在**新配置版本**中的 `baseScore`,不修改历史版本的数值。
- 单次调分幅度建议不超过 ±20 分,避免评分体系发生剧烈跳变导致玩家困惑(此为维护建议,非代码强制校验)。
- 新增装备/干员时,建议参考同类别中强度相近的已有条目分数区间赋值,保持体系内部一致性。

## 3. 综合评分(Combination Score)

### 3.1 公式

```
totalScore = round(
    weaponWeight   * weaponItem.baseScore  +
    helmetWeight   * helmetItem.baseScore  +
    armorWeight    * armorItem.baseScore   +
    operatorWeight * operatorItem.baseScore
)

约束: weaponWeight + helmetWeight + armorWeight + operatorWeight = 1
```

- 权重系数来自 `ScoreWeightConfig`(见 `DATA-MODEL.md` 2.2 节),随配置版本变化,不写死在代码中。
- V0.1 推荐初始权重(可由产品/运营调整,不属于代码逻辑):`weapon=0.4, helmet=0.2, armor=0.2, operator=0.2`(武器对整体强度影响最大,故权重最高)。
- 计算结果四舍五入为整数,展示时始终为 0-100 的整数。

### 3.2 扩展位:协同加成(Synergy Bonus)

V0.1 **不实现**协同加成(例如"某干员 + 某武器组合有额外加分"),但数据结构与引擎接口预留扩展位:`scoring-engine` 的核心计算函数应设计为可插拔的"评分策略"接口,后续版本可以在权重求和的基础上叠加一个 `synergyBonus(combination): number` 的修正函数,而不需要重写整个计算流程。

## 4. 评分区间抽取算法

这是本项目**最核心的技术挑战**:如何在用户设定 `[minScore, maxScore]` 后,高效地只抽取到落在区间内的组合,而不是"抽了再判断,不满足就重抽"导致的不可控延迟。

### 4.1 问题形式化

给定四个槶位各自的候选池(每个槶位内所有 `enabled=true` 的条目及其 `baseScore`),要在满足:

```
minScore ≤ round(Σ weight_i * score_i) ≤ maxScore
```

的约束下,从四个槶位中各随机选出一项,且要求**结果尽量保持随机性**(不能每次都返回同一个"凑分"最方便的组合,否则失去抽取的娱乐性)。

### 4.2 算法设计:约束传播预筛 + 加权随机 + 拒绝采样兜底

**第一步:预筛(约束传播)**

对每个槶位,计算"假设该槶位选择某个具体条目,其余三个槶位在各自候选池中取最优/最差表现时,综合分是否有可能落入区间"。具体做法:

1. 预先计算每个槶位候选池的 `minPossibleContribution` 与 `maxPossibleContribution`(即该槶位权重 × 池内最低/最高 baseScore)。
2. 对槶位 X 中的某个候选条目 `item`,其贡献值固定为 `weight_X * item.baseScore`。剩余三个槶位的贡献值范围是各自 `min/max` 之和。
3. 若 `item` 的固定贡献 + 其余三槶位的 `maxPossibleContribution` 之和 < `minScore`,或 `item` 的固定贡献 + 其余三槶位的 `minPossibleContribution` 之和 > `maxScore`,则该 `item` **不可能**参与任何满足区间要求的组合,从候选池中剔除。
4. 对四个槶位都执行上述剔除,得到"预筛后的候选池"。

**第二步:预筛后候选池的加权随机抽取 + 校验**

1. 在预筛后的候选池中,按各槶位的 `weight` 字段做加权随机,分别选出武器/头盔/护甲/干员。
2. 计算实际综合分,若落在 `[minScore, maxScore]` 内则直接返回结果。
3. 若不满足(预筛只是必要条件不是充分条件,存在"单项可行但组合不可行"的情况),则重新执行第二步,最多重试 `MAX_RETRY`(建议值:50)次。

**第三步:兜底策略**

1. 若预筛阶段发现任一槶位的候选池被剔到空集,说明该区间在当前配置下**理论上不可能达成**,直接返回明确的"无法满足该区间"结果,不进入抽取流程(前端据此提示用户调整区间,对应 PRD F3 验收标准)。
2. 若预筛通过但重试 `MAX_RETRY` 次后仍未命中区间(小概率但可能发生,尤其区间很窄时),采用兜底方案:在预筛候选池中,通过一次确定性搜索(例如从预筛池中选出使总分最接近区间中点的组合)返回一个满足区间要求的结果,保证用户不会看到"抽取失败"。这一步应有日志记录,便于观察实际命中率、评估是否需要调整算法或提示文案。

### 4.3 性能与实现要求

- 预筛结果(每个槶位候选池的 min/max 贡献值)应按**配置版本**缓存(见 `ARCHITECTURE.md` 第 6 节的 Redis 缓存方案),避免每次请求都重新扫描全部装备数据。配置发布新版本时必须主动失效对应缓存。
- 全区间(不设 minScore/maxScore,或区间覆盖 0-100)场景应直接走"无约束加权随机",跳过预筛与重试逻辑,保证默认体验没有额外性能开销。
- `MAX_RETRY` 与"是否已提前判定不可能"等参数应作为可配置常量,不硬编码魔法数字散落在多处。

### 4.4 伪代码

```
function drawCombination(pools, weights, range?):
    if range is None:
        return weightedRandomPick(pools)  # 无约束场景,直接加权随机

    filteredPools = applyConstraintPropagation(pools, weights, range)
    for category in filteredPools:
        if filteredPools[category] is empty:
            return { feasible: false }  # 区间在当前配置下不可达成

    for attempt in 1..MAX_RETRY:
        candidate = weightedRandomPick(filteredPools)
        score = computeTotalScore(candidate, weights)
        if range.min <= score <= range.max:
            return { feasible: true, combination: candidate, score }

    fallback = findClosestToMidpoint(filteredPools, weights, range)
    return { feasible: true, combination: fallback, score: computeTotalScore(fallback, weights), usedFallback: true }
```

## 5. 单元测试要求

`scoring-engine` 作为核心资产,必须覆盖以下测试场景(实现阶段以此为验收依据,不是建议而是硬性要求):

1. 给定固定的四项分数与权重,综合评分计算结果符合公式(基础正确性)。
2. 权重之和不为 1 时,配置加载阶段应拒绝该配置(校验逻辑测试,见 `CONFIG-SCHEMA.md`)。
3. 全区间抽取(无 minScore/maxScore)不触发预筛与重试逻辑,行为等价于纯加权随机。
4. 设定一个明显可达成的区间(如 40-60),抽取结果的分数必须落在区间内。
5. 设定一个当前配置下**不可达成**的区间(如 min=99, max=100 但配置数据分数上限不到 99),返回 `feasible: false`,且不发生死循环或超时。
6. 设定一个极窄但**理论可达成**的区间,验证兜底策略(重试耗尽后)最终仍返回落在区间内(或至少给出 `usedFallback: true` 标记)的结果,而不是无限重试。
7. 同一输入多次调用,结果具备随机性(不是每次都返回同一组合),用统计方式断言(如运行 N 次,结果去重后种类数 > 1,在候选池足够大的前提下)。

## 6. 变更记录

| 日期       | 版本 | 说明                           |
| ---------- | ---- | ------------------------------ |
| 2026-07-21 | v0.1 | 初版评分公式与区间抽取算法定义 |
