# 配置数据规范

> 版本:v0.3 最后更新:2026-07-22
> 目的:定义官方装备/干员配置在数据库中的结构、维护流程与校验约束,使"游戏版本更新导致的分数调整"成为一次纯数据变更,不牵涉业务代码。并约定后续用户自定义方案的扩展边界,避免日后重构抽取链路。

## 1. 存储模型总览

```
PostgreSQL
├── gear_items              # 官方默认池:武器/头盔/护甲/干员(权威分数与属性)
├── score_weight_configs    # 官方评分权重(单例行 id = "official")
└── config_revisions        # 官方配置版本标签(单例行 id = "official")
```

- **官方默认配置的唯一真相源是数据库**,不再使用 `configs/game-data/*.json`。
- 运行时 `GearConfigService` 只从 DB 读取官方配置,组装为 `EffectivePool` 后交给 `scoring-engine`。
- 初始/开发环境通过 `prisma/seed.ts` 写入占位或真实数据;生产环境改分走 SQL / 管理后台(后者为后续版本),不通过改仓库 JSON。
- `config_revisions.versionTag` 是全局官方版本标签,用途:
  1. Redis 预筛索引缓存的失效 key(见 `ARCHITECTURE.md`);
  2. 写入 `DrawRecord.configVersion`,用于按"强度调整前后"做数据分析。
- **历史抽取结果不受配置更新影响**,由 `DrawRecord` 的装备快照机制保证(见 `DATA-MODEL.md`),与配置存在文件还是数据库无关。

### 1.1 与后续"用户方案"的边界(预留,本期不实现)

| 层级     | 存什么                                        | 谁维护    | 能否改分数      |
| -------- | --------------------------------------------- | --------- | --------------- |
| 官方默认 | 全量条目 + `baseScore` + 权重                 | 运营/开发 | ✅ 唯一可改分处 |
| 用户方案 | 相对官方默认的**排除列表**(`excludedItemIds`) | 登录用户  | ❌ 不可改分     |

运行时公式(未来):

```text
EffectivePool = officialItems
  .filter(item => item.enabled)
  .filter(item => !userScheme.excludedItemIds.includes(item.id))
```

V0.1 无用户方案时:`EffectivePool = officialItems.filter(enabled)`。抽取服务必须按"有效池"编程,禁止写死"永远等于全表"。

分享码(未来):指向用户方案记录或其排除列表编码,**不复制分数**;导入方始终使用当前官方分数。

## 2. 表级字段约束

字段定义以 `DATA-MODEL.md` 为准,本节补充**库内约束与语义校验**。

### 2.1 `gear_items`

| 约束        | 说明                                                                           |
| ----------- | ------------------------------------------------------------------------------ |
| `id` 主键   | 格式建议 `{category}_{slug}`,如 `weapon_ak12`;应用层校验 `^[a-z]+_[a-z0-9_]+$` |
| `category`  | 枚举:`weapon` / `helmet` / `armor` / `operator`                                |
| `baseScore` | 整数 0–100                                                                     |
| `rarity`    | 可选枚举:`common` / `rare` / `epic` / `legendary`                              |
| `weight`    | 可选,默认 1,必须 `> 0`                                                         |
| `enabled`   | `false` 表示官方下架,不进入默认有效池                                          |

同表内 `id` 全局唯一(主键已保证)。

### 2.2 `score_weight_configs`

- 官方权重使用固定主键 `id = "official"`(单例)。
- `weaponWeight + helmetWeight + armorWeight + operatorWeight` 必须等于 `1`(允许 ±0.001)。
- 四项均在 `[0, 1]`。

### 2.3 `config_revisions`

- 官方版本使用固定主键 `id = "official"`(单例)。
- `versionTag` 格式建议 `^\d{4}\.\d{2}(\.\d+)?$`(如 `2026.07`、`2026.07.1`)。
- **任何对官方条目分数/上下架/权重的实质变更,都必须同步 bump `versionTag`**,否则 Redis 缓存可能继续使用旧索引。

## 3. 配置变更 SOP(标准操作流程)

1. **确定变更范围**:新增条目、调分、下架(`enabled=false`),或改权重。
2. **写入数据库**:通过 seed 更新(开发期)、迁移脚本、或后续管理后台修改对应行。
3. **bump `config_revisions.versionTag`**:有实质影响的变更必须更新。
4. **校验**:本地/CI 跑 `pnpm config:validate`(校验 seed 数据与约束);有真实库环境时可用集成测试再验一轮权重之和。
5. **发布后缓存失效**:后端感知到新 `versionTag` 后,失效 Redis 预筛索引缓存。
6. **追溯**:改库操作应留下可审计记录——开发期靠 Git 中的 seed/迁移 diff + commit message;上线管理后台后靠操作日志表(后续再定)。

## 4. AI Agent 操作约束

- 处理"武器加强/削弱""新增装备/干员"时,**改数据库相关定义与 seed/迁移数据**,禁止再引入 `configs/game-data` JSON 作为真相源。
- 禁止为了"保留历史"去复制整表多版本官方配置;历史结果靠 `DrawRecord` 快照。
- 不得实现"用户改 baseScore";用户方案若落地,只允许排除条目。
- 若需新增字段(如配件槽位),必须先改 `DATA-MODEL.md` 与本文件,再改 Prisma / shared-types。

## 5. 变更记录

| 日期       | 版本 | 说明                                                                           |
| ---------- | ---- | ------------------------------------------------------------------------------ |
| 2026-07-21 | v0.1 | 初版:按版本号拆分的 JSON 文件 + manifest                                       |
| 2026-07-22 | v0.2 | 改为每类别单一 JSON 文件,移除 manifest                                         |
| 2026-07-22 | v0.3 | 官方配置改为 PostgreSQL 存储;JSON 文件方案废弃;明确用户方案=排除列表的预留边界 |
