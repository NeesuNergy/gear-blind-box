# configs/game-data

版本化的装备/干员配置数据,完整规范见 `docs/03-spec/CONFIG-SCHEMA.md`。

**当前状态**:仅包含工程骨架阶段的占位模板数据(`enabled: false`),真实的武器/头盔/护甲/干员分数尚未录入。业务实现阶段请按 `CONFIG-SCHEMA.md` 第 3 节的 SOP 新增版本文件并更新 `manifest.json`,不要直接覆盖已发布的版本文件。

## 校验

```bash
pnpm config:validate
```

该命令(`scripts/validate-game-config.ts`)会:

1. 对 `weapons/` `helmets/` `armors/` `operators/` 下的每个文件做 `schemas/gear-item-list.schema.json` 校验
2. 对 `weights/` 下的每个文件做 `schemas/score-weight-config.schema.json` 校验,并检查四项权重之和为 1
3. 对 `manifest.json` 做 `schemas/manifest.schema.json` 校验,并检查引用的版本号文件确实存在
4. 检查每个类别文件内 `id` 字段全局唯一

CI 中会自动执行该命令,校验失败将阻止合并。
