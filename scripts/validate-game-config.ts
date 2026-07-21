/**
 * 配置文件校验脚本。
 * 对应 docs/03-spec/CONFIG-SCHEMA.md 第 3 节"CI 自动校验"要求。
 *
 * 校验内容:
 * 1. weapons/helmets/armors/operators 下每个文件符合 gear-item-list.schema.json
 * 2. weights 下每个文件符合 score-weight-config.schema.json,且四项权重之和为 1(±0.001)
 * 3. manifest.json 符合 manifest.schema.json,且引用的版本号对应的文件必须存在
 * 4. 每个类别文件内 id 字段全局唯一
 *
 * 用法:pnpm config:validate
 */
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import Ajv, { type ValidateFunction } from 'ajv';
import addFormats from 'ajv-formats';

const ROOT = join(__dirname, '..');
const GAME_DATA_DIR = join(ROOT, 'configs', 'game-data');
const SCHEMAS_DIR = join(GAME_DATA_DIR, 'schemas');

const GEAR_CATEGORIES = ['weapons', 'helmets', 'armors', 'operators'] as const;
const WEIGHT_SUM_TOLERANCE = 0.001;

const ajv = new Ajv({ allErrors: true });
addFormats(ajv);

function loadJson<T>(path: string): T {
  return JSON.parse(readFileSync(path, 'utf-8')) as T;
}

function compileSchema(fileName: string): ValidateFunction {
  const schema = loadJson<Record<string, unknown>>(join(SCHEMAS_DIR, fileName));
  return ajv.compile(schema);
}

interface GearItem {
  id: string;
  [key: string]: unknown;
}

interface GearItemList {
  versionTag: string;
  items: GearItem[];
}

interface ScoreWeightConfig {
  versionTag: string;
  weaponWeight: number;
  helmetWeight: number;
  armorWeight: number;
  operatorWeight: number;
}

interface ConfigManifest {
  activeVersions: Record<string, string>;
  history: Array<{ category: string; versionTag: string; publishedAt: string; note: string }>;
}

let hasError = false;

function reportError(message: string): void {
  hasError = true;
  console.error(`✗ ${message}`);
}

function reportOk(message: string): void {
  console.log(`✓ ${message}`);
}

function validateGearCategory(category: string, validate: ValidateFunction): void {
  const dir = join(GAME_DATA_DIR, category);
  const files = readdirSync(dir).filter((f) => f.endsWith('.json'));

  for (const file of files) {
    const filePath = join(dir, file);
    const data = loadJson<GearItemList>(filePath);

    if (!validate(data)) {
      reportError(
        `${category}/${file} 未通过 gear-item-list.schema.json 校验:\n${ajv.errorsText(validate.errors, { separator: '\n' })}`,
      );
      continue;
    }

    const ids = data.items.map((item) => item.id);
    const duplicateIds = ids.filter((id, index) => ids.indexOf(id) !== index);
    if (duplicateIds.length > 0) {
      reportError(`${category}/${file} 存在重复的 id: ${[...new Set(duplicateIds)].join(', ')}`);
      continue;
    }

    reportOk(`${category}/${file} 通过校验(${data.items.length} 条数据)`);
  }
}

function validateWeights(validate: ValidateFunction): void {
  const dir = join(GAME_DATA_DIR, 'weights');
  const files = readdirSync(dir).filter((f) => f.endsWith('.json'));

  for (const file of files) {
    const filePath = join(dir, file);
    const data = loadJson<ScoreWeightConfig>(filePath);

    if (!validate(data)) {
      reportError(
        `weights/${file} 未通过 score-weight-config.schema.json 校验:\n${ajv.errorsText(validate.errors, { separator: '\n' })}`,
      );
      continue;
    }

    const sum = data.weaponWeight + data.helmetWeight + data.armorWeight + data.operatorWeight;
    if (Math.abs(sum - 1) > WEIGHT_SUM_TOLERANCE) {
      reportError(
        `weights/${file} 四项权重之和为 ${sum},应为 1(允许误差 ±${WEIGHT_SUM_TOLERANCE})`,
      );
      continue;
    }

    reportOk(`weights/${file} 通过校验(权重之和 = ${sum})`);
  }
}

function validateManifest(validate: ValidateFunction): void {
  const manifestPath = join(GAME_DATA_DIR, 'manifest.json');
  const manifest = loadJson<ConfigManifest>(manifestPath);

  if (!validate(manifest)) {
    reportError(
      `manifest.json 未通过 manifest.schema.json 校验:\n${ajv.errorsText(validate.errors, { separator: '\n' })}`,
    );
    return;
  }

  const categoryToDir: Record<string, string> = {
    weapons: 'weapons',
    helmets: 'helmets',
    armors: 'armors',
    operators: 'operators',
    weights: 'weights',
  };

  for (const [category, versionTag] of Object.entries(manifest.activeVersions)) {
    const dir = categoryToDir[category];
    const expectedFile = join(GAME_DATA_DIR, dir, `${versionTag}.json`);
    try {
      readFileSync(expectedFile);
    } catch {
      reportError(
        `manifest.json 中 activeVersions.${category} 指向的版本 "${versionTag}" 找不到对应文件:${expectedFile}`,
      );
      continue;
    }
    reportOk(`manifest.json activeVersions.${category} = ${versionTag} 对应文件存在`);
  }
}

function main(): void {
  const gearItemListValidate = compileSchema('gear-item-list.schema.json');
  const weightConfigValidate = compileSchema('score-weight-config.schema.json');
  const manifestValidate = compileSchema('manifest.schema.json');

  for (const category of GEAR_CATEGORIES) {
    validateGearCategory(category, gearItemListValidate);
  }
  validateWeights(weightConfigValidate);
  validateManifest(manifestValidate);

  if (hasError) {
    console.error('\n配置校验失败,详见上方错误信息。');
    process.exit(1);
  }

  console.log('\n全部配置校验通过。');
}

main();
