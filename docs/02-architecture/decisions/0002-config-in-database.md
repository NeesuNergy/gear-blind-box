# ADR-0002:官方装备配置改为数据库存储

> 状态:已采纳(Accepted) 日期:2026-07-22
> 替代:`ADR-0001` 第 5 条"装备/干员配置数据用 Git 版本化 JSON 文件"的决策。

## 背景

V0.1 曾选择用 `configs/game-data/*.json` 存放官方装备/干员分数,以便无管理后台时走 Git PR 评审。随后明确了后续产品方向:

1. 官方默认配置将作为**权威分数源**,用户自定义方案(后续版本)只能排除条目、不能改分。
2. 用户方案、分享码天然属于账号侧数据,必须落在数据库。
3. 路线图中管理后台会直接改官方配置;若现在用 JSON、以后再迁库,运行时读取路径会换一次。

在业务实现尚未铺开时,提前统一为"运行时只读 DB"的成本低于未来迁移成本。

## 决策

1. **官方默认配置(GearItem / ScoreWeightConfig / ConfigRevision)直接存 PostgreSQL**,由 Prisma 管理。
2. **废弃 `configs/game-data` JSON 作为真相源**;开发期初始数据通过 `prisma/seed.ts`(+ `prisma/seed-data.ts`)写入。
3. **抽取链路按 EffectivePool 设计**:`官方启用条目 − (未来)用户排除列表`。
4. **用户方案(后续)只存 `excludedItemIds` + 分享元数据**,不存分数副本。
5. 配置变更须 bump `config_revisions.versionTag`,用于缓存失效与 `DrawRecord.configVersion`。

## 备选方案与放弃理由

| 备选方案                             | 放弃理由                                                                     |
| ------------------------------------ | ---------------------------------------------------------------------------- |
| 继续 JSON 文件,用户方案另存 DB       | 官方与用户两套存储,管理后台落地时仍要迁官方配置;与"设计先行避免重构"目标冲突 |
| JSON 为人编辑真相源、启动时同步进 DB | 多一套同步逻辑,MVP 阶段收益有限;已决定直接以 DB 为准                         |
| 用户也可改 baseScore                 | 触发官方更新与用户改分的合并问题,分享语义复杂;产品上改为仅排除条目           |

## 影响

- CI 的 `pnpm config:validate` 改为校验 seed 数据约束,不再校验 JSON Schema 文件目录。
- `ARCHITECTURE.md` / `CONFIG-SCHEMA.md` / `DATA-MODEL.md` / Prisma Schema 需同步到 v0.3。
- ADR-0001 第 5 条不再适用,以本 ADR 为准。
- 本地与部署流程增加:迁移 + seed 后服务才能读到装备数据。
