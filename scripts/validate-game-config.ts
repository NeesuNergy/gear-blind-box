/**
 * 官方配置 seed 约束校验。
 * 对应 docs/03-spec/CONFIG-SCHEMA.md 第 3 节。
 *
 * 校验内容:
 * 1. gear item 字段合法性(id / category / baseScore / weight)
 * 2. id 唯一;每类至少 1 条(骨架阶段允许 enabled=false)
 * 3. 权重之和为 1(±0.001);versionTag 格式
 *
 * 用法:pnpm config:validate
 */
import {
  OFFICIAL_VERSION_TAG,
  OFFICIAL_WEIGHTS,
  SEED_GEAR_ITEMS,
  type SeedGearCategory,
  type SeedGearItem,
} from '../prisma/seed-data';

const WEIGHT_SUM_TOLERANCE = 0.001;
const ID_PATTERN = /^[a-z]+_[a-z0-9_]+$/;
const VERSION_TAG_PATTERN = /^\d{4}\.\d{2}(\.\d+)?$/;
const CATEGORIES: SeedGearCategory[] = ['weapon', 'helmet', 'armor', 'operator'];

let hasError = false;

function reportError(message: string): void {
  hasError = true;
  console.error(`✗ ${message}`);
}

function reportOk(message: string): void {
  console.log(`✓ ${message}`);
}

function validateVersionTag(): void {
  if (!VERSION_TAG_PATTERN.test(OFFICIAL_VERSION_TAG)) {
    reportError(
      `OFFICIAL_VERSION_TAG="${OFFICIAL_VERSION_TAG}" 不符合 ^\\d{4}\\.\\d{2}(\\.\\d+)?$`,
    );
    return;
  }
  reportOk(`versionTag = ${OFFICIAL_VERSION_TAG}`);
}

function validateWeights(): void {
  const { weaponWeight, helmetWeight, armorWeight, operatorWeight } = OFFICIAL_WEIGHTS;
  for (const [name, value] of Object.entries(OFFICIAL_WEIGHTS)) {
    if (value < 0 || value > 1) {
      reportError(`${name}=${value} 必须在 [0, 1]`);
    }
  }
  const sum = weaponWeight + helmetWeight + armorWeight + operatorWeight;
  if (Math.abs(sum - 1) > WEIGHT_SUM_TOLERANCE) {
    reportError(`四项权重之和为 ${sum},应为 1(允许误差 ±${WEIGHT_SUM_TOLERANCE})`);
    return;
  }
  reportOk(`weights 通过校验(权重之和 = ${sum})`);
}

function validateGearItems(): void {
  if (SEED_GEAR_ITEMS.length === 0) {
    reportError('SEED_GEAR_ITEMS 不能为空');
    return;
  }

  const ids = SEED_GEAR_ITEMS.map((item) => item.id);
  const duplicateIds = ids.filter((id, index) => ids.indexOf(id) !== index);
  if (duplicateIds.length > 0) {
    reportError(`存在重复的 id: ${[...new Set(duplicateIds)].join(', ')}`);
  }

  const byCategory = new Map<SeedGearCategory, SeedGearItem[]>();
  for (const category of CATEGORIES) {
    byCategory.set(category, []);
  }

  for (const item of SEED_GEAR_ITEMS) {
    if (!ID_PATTERN.test(item.id)) {
      reportError(`id="${item.id}" 不符合 ^[a-z]+_[a-z0-9_]+$`);
    }
    if (!CATEGORIES.includes(item.category)) {
      reportError(`id="${item.id}" 的 category="${item.category}" 非法`);
    }
    if (!Number.isInteger(item.baseScore) || item.baseScore < 0 || item.baseScore > 100) {
      reportError(`id="${item.id}" 的 baseScore=${item.baseScore} 必须是 0-100 的整数`);
    }
    if (item.weight !== undefined && item.weight <= 0) {
      reportError(`id="${item.id}" 的 weight=${item.weight} 必须 > 0`);
    }
    if (!item.name || item.name.trim().length === 0) {
      reportError(`id="${item.id}" 的 name 不能为空`);
    }
    byCategory.get(item.category)?.push(item);
  }

  for (const category of CATEGORIES) {
    const items = byCategory.get(category) ?? [];
    if (items.length === 0) {
      reportError(`缺少 category=${category} 的条目`);
      continue;
    }
    reportOk(`${category}: ${items.length} 条`);
  }
}

function main(): void {
  validateVersionTag();
  validateWeights();
  validateGearItems();

  if (hasError) {
    console.error('\n配置校验失败,详见上方错误信息。');
    process.exit(1);
  }

  console.log('\n全部配置校验通过。');
}

main();
