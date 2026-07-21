# features/score-range/

评分区间筛选功能域(PRD F3)。

计划包含(骨架阶段尚未实现):

- 评分区间设置交互组件(滑块/输入框),区间边界参考 `GET /api/v1/gear-config` 返回的 `scoreBounds`
- 区间状态管理(建议使用 Zustand,见 `docs/02-architecture/ARCHITECTURE.md` 技术栈选型表)
- 区间不可达成场景的提示文案与交互(对应 `SCORE_RANGE_INFEASIBLE` 错误码,见 `docs/03-spec/API-SPEC.md` 3.2 节)
- 区间相关埋点触发(`score_range_set` / `score_range_cleared`,见 `docs/03-spec/ANALYTICS-SPEC.md` 第 3 节)
