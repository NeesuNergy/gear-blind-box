# features/draw/

随机装备抽取功能域(PRD F1/F2)。

计划包含(骨架阶段尚未实现):

- 触发抽取的交互组件与调用 `POST /api/v1/draw` 的 hook(见 `docs/03-spec/API-SPEC.md` 3.2 节)
- 抽取结果展示组件(四个槶位 + 综合评分,见 `docs/03-spec/SCORING-SPEC.md`)
- 抽取相关埋点触发(`draw_triggered` / `draw_result_shown`,见 `docs/03-spec/ANALYTICS-SPEC.md` 第 3 节)

前端不得自行计算综合评分,所有分数以后端返回为准(见 `docs/02-architecture/ARCHITECTURE.md` 第 4 节模块职责边界)。
