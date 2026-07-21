# 配置文件规范

> 版本:v0.1 最后更新:2026-07-21
> 目的:定义装备/干员配置数据的目录结构、Schema、版本发布与校验流程,使"游戏版本更新导致的分数调整"成为一次纯数据变更,不牵涉业务代码。

## 1. 目录结构

```
configs/
└── game-data/
    ├── manifest.json                  # 版本清单,指向当前生效版本
    ├── weights/
    │   ├── 2026.07.json                # 该版本对应的评分权重配置
    │   └── ...
    ├── weapons/
    │   ├── 2026.07.json
    │   └── ...
    ├── helmets/
    │   ├── 2026.07.json
    │   └── ...
    ├── armors/
    │   ├── 2026.07.json
    │   └── ...
    └── operators/
        ├── 2026.07.json
        └── ...
```

- 每个类别(武器/头盔/护甲/干员/权重)独立按版本号存放文件,允许**只更新某一类别**而不动其他类别(例如某次更新只削弱了几把武器,不需要重新发布干员配置)。
- `manifest.json` 决定"当前生效版本",支持每个类别指向不同版本号(见 2.3 节),以支持颗粒度更细的发布节奏。

## 2. Schema 定义

### 2.1 装备/干员条目 Schema(weapons / helmets / armors / operators 通用)

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "GearItemList",
  "type": "object",
  "required": ["versionTag", "items"],
  "properties": {
    "versionTag": { "type": "string", "pattern": "^\\d{4}\\.\\d{2}(\\.\\d+)?$" },
    "items": {
      "type": "array",
      "minItems": 1,
      "items": {
        "type": "object",
        "required": ["id", "category", "name", "baseScore", "enabled"],
        "properties": {
          "id": { "type": "string", "pattern": "^[a-z]+_[a-z0-9_]+$" },
          "category": { "type": "string", "enum": ["weapon", "helmet", "armor", "operator"] },
          "subCategory": { "type": "string" },
          "name": { "type": "string", "minLength": 1 },
          "baseScore": { "type": "integer", "minimum": 0, "maximum": 100 },
          "rarity": { "type": "string", "enum": ["common", "rare", "epic", "legendary"] },
          "weight": { "type": "number", "exclusiveMinimum": 0, "default": 1 },
          "imageUrl": { "type": "string" },
          "description": { "type": "string" },
          "enabled": { "type": "boolean" }
        },
        "additionalProperties": false
      }
    }
  },
  "additionalProperties": false
}
```

> 注:文件内不重复存储 `versionTag` 到每个 item 上(item 级别的 `versionTag` 由加载器根据文件所属版本自动补充),避免冗余字段导致的一致性风险。

### 2.2 权重配置 Schema(weights)

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "ScoreWeightConfig",
  "type": "object",
  "required": ["versionTag", "weaponWeight", "helmetWeight", "armorWeight", "operatorWeight"],
  "properties": {
    "versionTag": { "type": "string" },
    "weaponWeight": { "type": "number", "minimum": 0, "maximum": 1 },
    "helmetWeight": { "type": "number", "minimum": 0, "maximum": 1 },
    "armorWeight": { "type": "number", "minimum": 0, "maximum": 1 },
    "operatorWeight": { "type": "number", "minimum": 0, "maximum": 1 }
  },
  "additionalProperties": false
}
```

**额外的语义校验(Schema 无法直接表达,需在加载器代码中实现,并有对应单元测试):**

- `weaponWeight + helmetWeight + armorWeight + operatorWeight` 必须等于 `1`(允许 ±0.001 浮点误差)。
- 同一文件内所有 `item.id` 必须唯一。
- `enabled: false` 的条目允许分数缺失合理性检查放宽(即历史下架条目不强制要求分数落在"参考区间"内),但字段本身仍必须存在。

### 2.3 版本清单 Schema(manifest.json)

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "ConfigManifest",
  "type": "object",
  "required": ["activeVersions", "history"],
  "properties": {
    "activeVersions": {
      "type": "object",
      "required": ["weapons", "helmets", "armors", "operators", "weights"],
      "properties": {
        "weapons": { "type": "string" },
        "helmets": { "type": "string" },
        "armors": { "type": "string" },
        "operators": { "type": "string" },
        "weights": { "type": "string" }
      },
      "additionalProperties": false
    },
    "history": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["category", "versionTag", "publishedAt", "note"],
        "properties": {
          "category": { "type": "string" },
          "versionTag": { "type": "string" },
          "publishedAt": { "type": "string", "format": "date" },
          "note": { "type": "string" }
        }
      }
    }
  }
}
```

示例:

```json
{
  "activeVersions": {
    "weapons": "2026.07.1",
    "helmets": "2026.07",
    "armors": "2026.07",
    "operators": "2026.07",
    "weights": "2026.07"
  },
  "history": [
    {
      "category": "weapons",
      "versionTag": "2026.07",
      "publishedAt": "2026-07-01",
      "note": "初始配置"
    },
    {
      "category": "weapons",
      "versionTag": "2026.07.1",
      "publishedAt": "2026-07-15",
      "note": "版本更新:AK12 削弱 baseScore 75→65,新增 M4A1 冲锋枪型"
    }
  ]
}
```

## 3. 配置变更 SOP(标准操作流程)

1. **确定变更范围**:本次是新增条目、调整分数,还是新版本上线导致的批量调整?只改动涉及的类别文件,不必所有类别同步发新版本。
2. **新增文件而非覆盖旧文件**:在对应类别目录下新增 `{新版本号}.json` 文件,旧版本文件保留(用于历史记录追溯与 `DrawRecord` 快照校验)。
3. **更新 `manifest.json`**:将对应类别的 `activeVersions` 指向新版本号,并在 `history` 追加一条记录,`note` 字段必须写明变更原因(便于后续追溯"为什么这把武器分数变了")。
4. **提交 PR 走代码评审**:配置变更走与代码变更相同的 Git 流程(分支 + PR + Review),不允许直接改主分支。
5. **CI 自动校验**(合并前必须通过):
   - JSON Schema 校验(2.1/2.2/2.3 节定义的结构)。
   - 权重之和为 1 的语义校验。
   - `id` 唯一性校验。
   - `manifest.json` 中引用的版本号必须存在对应文件(不能指向不存在的版本)。
6. **发布后缓存失效**:后端加载新配置后,需要主动失效 `ARCHITECTURE.md` 中提到的 Redis 预筛索引缓存,避免评分区间抽取仍使用旧配置计算的索引。

## 4. AI Agent 操作约束

- AI Agent 在处理"武器加强/削弱""新增装备/干员"类需求时,**只允许新增配置文件 + 更新 manifest**,禁止直接修改历史版本文件的数值(历史版本文件应视为不可变的存档)。
- AI Agent 生成的任何配置变更,必须同步生成/更新对应的 CI 校验测试用例(如新增了新的 `category` 枚举值,必须先更新本文件的 Schema 定义,再改代码里的枚举类型)。
- 若需求中出现本文件未覆盖的字段诉求(例如要给武器加"配件槽位"字段),必须先在本文件补充 Schema 定义并说明用途,再进行编码实现。

## 5. 变更记录

| 日期       | 版本 | 说明                           |
| ---------- | ---- | ------------------------------ |
| 2026-07-21 | v0.1 | 初版配置 Schema 与发布流程定义 |
