# 系统架构文档

> 版本:v0.2 最后更新:2026-07-22
> 关联文档:`01-prd/PRD.md`、`03-spec/*`、`decisions/0001-tech-stack.md`、`decisions/0002-config-in-database.md`

## 1. 架构目标与原则

1. **配置驱动,而非硬编码**:游戏内容(武器/头盔/护甲/干员分数)会随游戏版本频繁变化,必须与业务代码解耦,改分数不改代码、不重新发版后端。
2. **MVP 从简,但骨架为扩展预留**:初期用最小可行的技术组合跑通功能,但目录结构、模块边界从第一天就按"未来会拆分"设计,避免后期大重构。
3. **关注点分离**:评分引擎(纯计算逻辑)、装备配置(数据)、抽取服务(业务流程)、埋点服务(数据采集)四者边界清晰,可独立测试、独立演进。
4. **AI Agent 友好**:目录结构、命名、模块职责保持强约定(Convention over Configuration),降低 AI 生成代码时的歧义空间。
5. **可观测优先于炫技**:优先保证埋点、日志、错误追踪能跑起来,而不是追求花哨的前端效果。

## 2. 系统上下文图

```mermaid
flowchart LR
    U[玩家/访客] -->|浏览器访问| WEB[Web 前端<br/>Next.js]
    WEB -->|REST API| API[后端服务<br/>NestJS]
    API --> ENGINE[评分引擎<br/>共享包 scoring-engine]
    API --> CONFIGSTORE[装备配置数据<br/>PostgreSQL]
    API --> DB[(PostgreSQL<br/>业务数据/埋点原始数据)]
    API --> CACHE[(Redis<br/>缓存/限流/预计算索引)]
    WEB -->|埋点事件| API
    CRON[定时聚合任务] --> DB
    CRON --> DB
```

## 3. 技术栈选型

| 层              | 选型                                                 | 理由                                                                              |
| --------------- | ---------------------------------------------------- | --------------------------------------------------------------------------------- |
| 前端框架        | Next.js(App Router) + TypeScript                     | SSR/SEO 友好,利于内容分享传播;生态成熟,AI Agent 训练数据覆盖充分,生成代码质量稳定 |
| UI              | Tailwind CSS + shadcn/ui                             | 快速搭建一致的视觉体系,减少自定义 CSS 维护成本                                    |
| 状态管理        | React Query(服务端数据) + 轻量 Zustand(本地 UI 状态) | 避免过度设计,按数据来源分层管理状态                                               |
| 后端框架        | NestJS + TypeScript                                  | 强约定的模块/控制器/服务分层,天然适合"多人/多 Agent 协作开发",降低代码风格发散    |
| ORM             | Prisma                                               | 类型安全,Schema 即文档,迁移管理成熟                                               |
| 数据库          | PostgreSQL                                           | 关系型数据 + JSONB 字段,足够支撑业务数据与埋点原始数据,后续可平滑迁移分析型存储   |
| 缓存/限流       | Redis                                                | 抽取接口限流、评分区间预计算索引缓存                                              |
| 包管理/仓库结构 | pnpm workspaces(Monorepo)                            | 前后端共享类型与评分引擎逻辑,避免逻辑漂移                                         |
| 部署            | Docker Compose(本地/自托管)+ Vercel(前端,可选)       | 前期低成本,后期可迁移到任意云厂商,不锁定 Vercel 特有能力                          |
| 监控            | 结构化日志(pino) + 错误追踪(Sentry,后续接入)         | MVP 阶段最低成本满足可观测需求                                                    |

> 技术选型的详细取舍记录见 `decisions/0001-tech-stack.md`。任何变更选型都需要新增一份 ADR,不能只改本表格。

## 4. Monorepo 模块划分

```
GearBlindBox/
├── apps/
│   ├── web/                 # Next.js 前端应用
│   └── api/                 # NestJS 后端应用
├── packages/
│   ├── scoring-engine/      # 纯函数评分引擎:输入装备数据+权重,输出分数(无副作用,单测覆盖率要求最高)
│   └── shared-types/        # 前后端共享的 TypeScript 类型定义(装备、组合、API DTO)
├── prisma/                  # Schema / 迁移 / seed(官方装备配置真相源在 DB)
└── docs/                    # 本文档体系
```

**模块职责边界**:

- `scoring-engine` 不依赖数据库、不依赖网络请求,只做"给定输入数据,计算输出分数/判断是否在区间内"的纯计算,保证可以脱离后端独立单测。
- `apps/api` 负责:从 DB 加载官方配置(及未来的用户排除列表)组装 EffectivePool → 调用 `scoring-engine` → 落库/埋点 → 返回给前端。业务流程编排在这一层,不在引擎层。
- `apps/web` 只做展示与交互,不做评分计算(即使为了快速反馈做前端预览,最终结果也必须以后端返回为准,避免前后端分数不一致)。
- 官方装备/干员/权重数据存放在 PostgreSQL,维护约束见 `CONFIG-SCHEMA.md`;开发期用 `prisma/seed` 初始化。

## 5. 核心数据流:一次抽取的完整链路

```mermaid
sequenceDiagram
    participant Browser as 前端
    participant API as 后端 API
    participant Engine as 评分引擎
    participant Cache as Redis
    participant DB as PostgreSQL

    Browser->>API: POST /api/v1/draw {minScore?, maxScore?}
    API->>Cache: 读取当前配置版本的预计算索引(各槶位分数分布)
    alt 索引缺失或过期
        API->>Engine: 基于当前配置数据重新计算索引
        Engine-->>API: 索引结果
        API->>Cache: 写入缓存
    end
    API->>Engine: 按约束条件筛选候选池并随机抽取
    Engine-->>API: 抽取结果(四个槽位 + 分项分数)
    API->>Engine: 计算综合评分
    Engine-->>API: 综合评分
    API->>DB: 落库抽取记录(含配置版本快照)
    API-->>Browser: 返回组合 + 分数
    Browser->>API: POST /api/v1/events(埋点:draw_result)
    API->>DB: 写入埋点事件
```

## 6. 数据存储方案

| 数据类型                      | 存储位置                                         | 说明                                                 |
| ----------------------------- | ------------------------------------------------ | ---------------------------------------------------- |
| 装备/干员基础数据(分数、属性) | PostgreSQL `gear_items`                          | 官方默认池;唯一可维护 baseScore 的地方(见 ADR-0002)  |
| 评分权重                      | PostgreSQL `score_weight_configs`(单例 official) | 四项权重之和为 1                                     |
| 官方配置版本标签              | PostgreSQL `config_revisions`(单例 official)     | 缓存失效 key + DrawRecord.configVersion              |
| 用户自定义方案(后续)          | PostgreSQL `user_schemes`(预留,V0.1 不建表)      | 仅存排除列表 + 分享码,不存分数                       |
| 用户抽取记录                  | PostgreSQL `draw_records`                        | 含配置版本与装备快照                                 |
| 埋点原始事件                  | PostgreSQL `analytics_events`(JSONB properties)  | 初期用关系库即可满足量级,量级增长后迁移方案见第 8 节 |
| 聚合指标(DAU/留存等)          | PostgreSQL 汇总表,由定时任务生成                 | 避免每次查询都全表扫描原始事件表                     |
| 评分区间预计算索引            | Redis                                            | 按 config_revisions.versionTag 缓存,变更后失效重建   |

## 7. 部署架构

- **本地开发**:`docker-compose.yml` 一键拉起 Postgres + Redis;`apps/web`、`apps/api` 用各自的 dev server。
- **生产环境(V0.1 建议)**:前端部署到 Vercel(或任意支持 Next.js 的平台);后端 + Postgres + Redis 用 Docker 部署在单台云主机(如轻量应用服务器),量级不大时无需 Kubernetes。
- **环境变量管理**:所有环境变量必须有 zod/schema 校验,启动时校验失败直接 fail-fast,禁止运行时才暴露配置错误。
- **CI 流程(最低要求)**:lint → typecheck → 单元测试(重点是 scoring-engine)→ 官方配置 seed 约束校验(`pnpm config:validate`) → build。

## 8. 演进路线(架构视角,与 `05-roadmap/ROADMAP.md` 对齐)

| 阶段      | 架构变化                                                                                                                                                                           |
| --------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| MVP(V0.1) | 单体式 Nest API + Next 前端,Postgres 存一切,评分区间用"约束筛选 + 拒绝采样"实时计算                                                                                                |
| V0.2      | 引入定时聚合任务计算 DAU/留存等指标;评分区间预计算索引接入 Redis                                                                                                                   |
| V1.0      | 引入账号体系(可选登录);抽取记录与账号关联,支持"历史记录"页面                                                                                                                       |
| V1.5+     | 埋点原始数据量增长后,评估迁移到 ClickHouse 或类似 OLAP 存储;管理后台可视化维护官方配置(库已就绪,主要补 UI/鉴权/操作审计);用户方案(排除列表)+ 分享码;评估拆分埋点采集为独立轻量服务 |

## 9. 非功能性需求

- **性能**:抽取接口 P95 响应时间 < 500ms(不含极端评分区间反复重试的边界场景,边界场景兜底策略见 `SCORING-SPEC.md`)。
- **安全**:抽取与埋点接口需基于匿名标识做速率限制,防止脚本刷接口污染数据;所有输入需做 schema 校验(zod/class-validator),不信任任何前端传入的分数计算结果。
- **可用性**:核心抽取功能不依赖第三方服务,避免外部服务不可用拖垮主功能。
- **可维护性**:任何"新增/调整装备分数"的操作,不应要求触碰 `apps/api` 或 `apps/web` 的业务代码。
- **可测试性**:`scoring-engine` 目标单测覆盖率 ≥ 90%(核心业务逻辑,详见 `CODING-STANDARDS.md`)。

## 10. 风险与应对

| 风险                                     | 应对                                                                               |
| ---------------------------------------- | ---------------------------------------------------------------------------------- |
| 评分区间过窄导致抽取算法长时间找不到结果 | `SCORING-SPEC.md` 中定义约束传播预筛 + 最大重试次数 + 明确失败提示,避免死循环      |
| 游戏版本更新后配置维护跟不上             | 官方配置在 DB,改分只动数据行并 bump versionTag;后续管理后台降低门槛                |
| 埋点数据量增长后拖慢主业务数据库         | 埋点写入与业务写入使用同一 DB 但不同表,提前预留"迁移到独立存储"的架构位(见第 8 节) |
| 早期过度设计导致 MVP 交付变慢            | 严格遵守 PRD 中定义的 MVP 范围,账号体系/管理后台等明确推迟到后续版本               |

## 11. 变更记录

| 日期       | 版本 | 说明                                                                                         |
| ---------- | ---- | -------------------------------------------------------------------------------------------- |
| 2026-07-21 | v0.1 | 初版架构文档                                                                                 |
| 2026-07-22 | v0.2 | 官方配置改为 PostgreSQL 存储(ADR-0002);移除 configs/game-data;预留用户方案(排除列表)演进说明 |
