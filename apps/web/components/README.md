# components/

展示型 UI 组件(Presentational Components),不包含业务状态与接口调用逻辑。

- 只接收 props 渲染 UI,不直接调用 `lib/api-client.ts` 或 `features/*` 的业务 hook。
- 与具体功能域强相关的组件(如抽取结果卡片的业务交互逻辑)放在 `features/*` 下,本目录仅保留可跨功能复用的通用组件(按钮、卡片容器、滑块等)。

对应规范:`docs/04-engineering/DIRECTORY-STRUCTURE.md` 第 1 节。
