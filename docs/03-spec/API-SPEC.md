# API 接口规范

> 版本:v0.1 最后更新:2026-07-21
> 基础路径:`/api/v1`。所有接口返回 JSON,字段使用 `camelCase`。

## 1. 设计原则

- **版本化前缀**:所有对外接口路径以 `/api/v1` 开头,未来 breaking change 通过 `/api/v2` 平滑迁移,不直接修改 v1 契约。
- **匿名优先**:V0.1 不要求登录,通过请求头 `X-Anonymous-Id` 传递匿名标识(前端首次访问时生成 UUID 并持久化到 localStorage)。
- **服务端为唯一评分权威**:前端不得自行计算分数,所有分数以后端返回为准,防止被篡改也防止前后端逻辑不一致。
- **输入严格校验**:所有请求体使用 class-validator/zod 校验,非法输入返回 `400`,不信任任何客户端传入的数值型参数超出合理范围。
- **限流**:核心接口(抽取、埋点)基于 `X-Anonymous-Id` + IP 做速率限制,防止刷量污染数据(详细阈值见第 5 节)。

## 2. 通用响应结构

成功响应:

```json
{
  "success": true,
  "data": {}
}
```

失败响应:

```json
{
  "success": false,
  "error": {
    "code": "SCORE_RANGE_INFEASIBLE",
    "message": "当前设定的评分区间在现有配置下无法达成"
  }
}
```

## 3. 核心接口

### 3.1 获取当前生效的装备配置(供前端展示装备图鉴/选择区间参考)

```
GET /api/v1/gear-config
```

**响应示例:**

```json
{
  "success": true,
  "data": {
    "configVersion": {
      "weapons": "2026.07.1",
      "helmets": "2026.07",
      "armors": "2026.07",
      "operators": "2026.07",
      "weights": "2026.07"
    },
    "weights": {
      "weaponWeight": 0.4,
      "helmetWeight": 0.2,
      "armorWeight": 0.2,
      "operatorWeight": 0.2
    },
    "scoreBounds": { "min": 12, "max": 96 },
    "items": {
      "weapons": [
        {
          "id": "weapon_ak12",
          "name": "AK12",
          "baseScore": 65,
          "rarity": "epic",
          "imageUrl": "/gear/weapon_ak12.png"
        }
      ],
      "helmets": [],
      "armors": [],
      "operators": []
    }
  }
}
```

- `scoreBounds` 是当前配置下理论可达成的综合评分最小/最大值,前端用于限制用户设定区间滑块的边界,避免用户设定一个必然 `infeasible` 的区间(体验优化,后端仍需做兜底校验)。
- 该接口结果可被 CDN/浏览器缓存较短时间(如 60 秒),配置变更频率低。

### 3.2 触发一次抽取

```
POST /api/v1/draw
```

**请求头:** `X-Anonymous-Id: <uuid>`(必填)

**请求体:**

```json
{
  "sessionId": "a1b2c3d4-...",
  "minScore": 60,
  "maxScore": 90
}
```

- `sessionId` 必填,前端每次进入页面生成一个会话级 UUID。
- `minScore` / `maxScore` 可选;不传即为全区间随机抽取。若只传一个,视为另一端取 0 或 100。

**成功响应:**

```json
{
  "success": true,
  "data": {
    "combination": {
      "weapon": { "id": "weapon_ak12", "name": "AK12", "score": 65 },
      "helmet": { "id": "helmet_lv4", "name": "四级头", "score": 80 },
      "armor": { "id": "armor_lv5", "name": "五级甲", "score": 88 },
      "operator": { "id": "operator_falcon", "name": "红隼", "score": 70 }
    },
    "totalScore": 74,
    "configVersion": "2026.07.1",
    "usedFallback": false
  }
}
```

**区间不可达成响应(HTTP 200,业务级失败,而非 HTTP 错误码,便于前端区分"网络错误"与"业务不可达成"):**

```json
{
  "success": false,
  "error": {
    "code": "SCORE_RANGE_INFEASIBLE",
    "message": "当前设定的评分区间在现有配置下无法达成,请调整区间后重试"
  }
}
```

**错误码:**

| code                     | 说明                                                                    |
| ------------------------ | ----------------------------------------------------------------------- |
| `INVALID_SCORE_RANGE`    | `minScore > maxScore` 或超出 0-100 范围                                 |
| `SCORE_RANGE_INFEASIBLE` | 区间在当前配置下理论不可达成(对应 `SCORING-SPEC.md` 4.2 节兜底策略判定) |
| `RATE_LIMITED`           | 触发速率限制                                                            |
| `VALIDATION_ERROR`       | 请求体字段校验失败(如缺少必填字段、类型不符),对应 HTTP 400              |

### 3.3 埋点事件上报

```
POST /api/v1/events
```

**请求头:** `X-Anonymous-Id: <uuid>`(必填)

**请求体(支持批量上报,减少请求数):**

```json
{
  "events": [
    {
      "eventName": "draw_triggered",
      "sessionId": "a1b2c3d4-...",
      "properties": { "hasScoreRange": true, "minScore": 60, "maxScore": 90 },
      "clientTimestamp": "2026-07-21T02:30:00.000Z"
    }
  ]
}
```

- 事件名称枚举与属性结构详见 `ANALYTICS-SPEC.md`,本接口只做通用转发与落库,不在 API 层做业务语义校验(业务口径统一维护在埋点规范文档,避免两处定义)。
- 该接口对失败**宽容**:客户端上报失败允许静默重试或丢弃,不得阻塞或影响主功能交互(对应 PRD F4 验收标准)。
- 响应始终返回 `{ "success": true }`(除非请求体结构本身非法),即使部分事件写入失败也不向前端暴露细节,避免前端为埋点失败做过多处理逻辑。

### 3.4 内部统计接口(V0.2 起,需鉴权,V0.1 可先不实现)

```
GET /api/v1/internal/stats/summary?from=2026-07-01&to=2026-07-21
```

- 仅限内部使用(运营/产品查看数据看板),V0.1 阶段可以先跳过实现,但接口路径与鉴权方式提前约定,避免后续随意设计导致命名混乱。
- 鉴权方式:V0.2 起使用固定的内部 Bearer Token(环境变量注入),不接入完整账号体系。

## 4. 状态码约定

| HTTP 状态码 | 使用场景                                                                                      |
| ----------- | --------------------------------------------------------------------------------------------- |
| 200         | 请求成功处理(包含业务级失败,如 `SCORE_RANGE_INFEASIBLE`,因为这是可预期的业务结果而非系统错误) |
| 400         | 请求参数结构非法(如 `minScore` 不是数字、缺少必填字段)                                        |
| 429         | 触发速率限制                                                                                  |
| 500         | 服务端未预期的异常                                                                            |

## 5. 限流策略(V0.1 建议值,可随实际情况调整)

| 接口                  | 限流维度            | 阈值                                    |
| --------------------- | ------------------- | --------------------------------------- |
| `POST /api/v1/draw`   | 按 `X-Anonymous-Id` | 每分钟 ≤ 20 次                          |
| `POST /api/v1/events` | 按 `X-Anonymous-Id` | 每分钟 ≤ 60 次(批量上报,阈值可适当放宽) |
| 全局                  | 按 IP               | 每分钟 ≤ 100 次(防御异常脚本流量)       |

超出限流的请求返回 `429`,响应体遵循第 2 节的失败结构,`code` 为 `RATE_LIMITED`。

## 6. 变更记录

| 日期       | 版本 | 说明                                                                                             |
| ---------- | ---- | ------------------------------------------------------------------------------------------------ |
| 2026-07-21 | v0.1 | 初版接口契约定义                                                                                 |
| 2026-07-21 | v0.1 | 工程骨架搭建阶段补充 `VALIDATION_ERROR` 错误码,用于承载全局 `ValidationPipe` 的 DTO 校验失败场景 |
