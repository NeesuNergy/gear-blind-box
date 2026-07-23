# 代码仓库目录规范

> 版本:v0.3 最后更新:2026-07-22

## 1. 顶层结构

```
GearBlindBox/
├── apps/
│   ├── web/                          # Next.js 前端
│   │   ├── app/                      # App Router 页面
│   │   ├── components/               # UI 组件(展示型,不含业务逻辑)
│   │   ├── features/                 # 按功能域划分的业务逻辑(draw/、score-range/ 等)
│   │   ├── lib/                      # 前端工具函数(API 客户端、埋点 SDK 封装)
│   │   └── tests/
│   └── api/                          # NestJS 后端
│       ├── src/
│       │   ├── draw/                 # 抽取模块(controller/service)
│       │   ├── gear-config/          # 配置加载与查询模块
│       │   ├── analytics/            # 埋点接收与聚合模块
│       │   ├── common/               # 全局中间件、过滤器、守卫(限流/校验)
│       │   ├── prisma/               # 全局 Prisma 客户端(PrismaModule/PrismaService),@Global 供各模块注入
│       │   └── main.ts
│       └── test/
├── packages/
│   ├── scoring-engine/               # 纯函数评分引擎,无框架依赖
│   │   ├── src/
│   │   └── test/
│   └── shared-types/                 # 前后端共享类型(装备、组合、DTO)
├── prisma/
│   ├── schema.prisma                 # 数据库模型,必须与 DATA-MODEL.md 保持一致
│   ├── seed-data.ts                  # 官方配置初始数据(开发/CI 校验用)
│   └── seed.ts                       # 写入 DB 的 seed 入口
├── docs/                              # 本文档体系
├── docker-compose.yml
├── pnpm-workspace.yaml
└── package.json
```

## 2. 各目录职责边界(禁止越界)

| 目录                      | 允许做的事                                                           | 禁止做的事                                                                      |
| ------------------------- | -------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| `apps/web`                | 页面渲染、用户交互、调用后端 API、展示后端返回的分数                 | 自行计算综合评分;直接查询装备配置表                                             |
| `apps/api`                | 业务流程编排(加载配置→调用评分引擎→落库→返回)、鉴权/限流、数据库访问 | 把评分公式的具体计算逻辑写在 controller/service 里而不是委托给 `scoring-engine` |
| `packages/scoring-engine` | 纯计算逻辑(评分公式、区间抽取算法)、无副作用的单元测试               | 引入数据库/HTTP/文件系统依赖                                                    |
| `packages/shared-types`   | 类型定义、可跨包复用的常量枚举                                       | 包含任何业务逻辑函数                                                            |
| `prisma/`                 | Schema、迁移、官方配置 seed                                          | 在业务代码中硬编码装备分数                                                      |

## 3. 命名约定

- 文件命名:TypeScript 文件统一 `kebab-case.ts`(如 `draw-record.service.ts`);React 组件文件 `PascalCase.tsx`。
- 模块内部按 NestJS 约定命名:`*.controller.ts` / `*.service.ts` / `*.module.ts` / `*.dto.ts`。
- 测试文件与被测文件同名,后缀 `.spec.ts`,尽量放在与源文件同级的 `__tests__` 或直接同目录(遵循 NestJS/Next.js 项目的通用惯例,不强制单一风格,但同一个 app 内部必须统一)。

## 4. 变更记录

| 日期       | 版本 | 说明                                                                 |
| ---------- | ---- | -------------------------------------------------------------------- |
| 2026-07-21 | v0.1 | 初版目录规范                                                         |
| 2026-07-22 | v0.2 | 移除 configs/game-data;官方配置改由 prisma seed + DB 表承担          |
| 2026-07-22 | v0.3 | 补充 `apps/api/src/prisma/` 全局数据库访问模块(业务逻辑落地阶段新增) |
