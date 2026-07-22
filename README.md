# GearBlindBox(装备盲盒)

《三角洲行动》社区玩法工具站 —— 随机装备抽取 + 组合评分 + 数据化运营。

> 项目文档(PRD / 架构 / 各类规范)见 [`docs/`](./docs/README.md),是本项目开发的唯一事实来源。当前仓库处于**工程骨架搭建阶段**,尚未接入具体业务逻辑(评分算法、抽取流程、埋点聚合等均为骨架/占位实现)。

## 目录结构

```
GearBlindBox/
├── apps/
│   ├── web/                 # 前端(Next.js)
│   └── api/                 # 后端(NestJS)
├── packages/
│   ├── scoring-engine/       # 评分引擎(纯函数,骨架阶段)
│   └── shared-types/         # 前后端共享类型
├── prisma/                    # Schema / 迁移 / 官方配置 seed
├── scripts/                    # 工程脚本(如 seed 约束校验)
└── docs/                       # 产品与工程文档
```

详细职责边界见 [`docs/04-engineering/DIRECTORY-STRUCTURE.md`](./docs/04-engineering/DIRECTORY-STRUCTURE.md)。

## 环境要求

- Node.js `20.13.1`(见 `.nvmrc`,建议用 `nvm use` 切换)
- pnpm `9.15.9`(建议通过 `corepack` 或 `npm install -g pnpm@9` 安装)
- Docker(用于本地启动 PostgreSQL / Redis)

## 快速开始

```bash
# 1. 安装依赖
pnpm install

# 2. 启动本地依赖服务(PostgreSQL + Redis)
docker compose up -d

# 3. 复制环境变量模板并按需修改
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env.local

# 4. 生成 Prisma Client 并迁移 + 写入官方配置 seed
pnpm db:generate
pnpm db:migrate:dev
pnpm db:seed

# 5. 启动开发服务器(前后端各开一个终端,分别执行)
pnpm dev:web   # http://localhost:3000 (Next.js 默认端口)
pnpm dev:api   # http://localhost:3001
```

## 常用脚本

| 命令                                                                           | 说明                                         |
| ------------------------------------------------------------------------------ | -------------------------------------------- |
| `pnpm lint`                                                                    | 对所有 workspace 包运行 ESLint               |
| `pnpm typecheck`                                                               | 对所有 workspace 包运行 TypeScript 类型检查  |
| `pnpm test`                                                                    | 对所有 workspace 包运行单元测试              |
| `pnpm build`                                                                   | 构建所有 workspace 包                        |
| `pnpm config:validate`                                                         | 校验官方配置 seed 数据约束(见 CONFIG-SCHEMA) |
| `pnpm db:generate` / `pnpm db:migrate:dev` / `pnpm db:seed` / `pnpm db:studio` | Prisma 相关操作                              |

## 开发规范

提交前请确保通过 `pnpm lint && pnpm typecheck && pnpm test`。提交信息遵循 [Conventional Commits](https://www.conventionalcommits.org/),详见 [`docs/04-engineering/CODING-STANDARDS.md`](./docs/04-engineering/CODING-STANDARDS.md)。
