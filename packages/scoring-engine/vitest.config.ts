import { defineConfig } from 'vitest/config';

/**
 * 覆盖率排除说明:
 * - index.ts 是纯 re-export 的 barrel 文件,无可执行逻辑。
 * - types.ts 仅包含类型定义,编译后无运行时代码。
 * 二者纳入覆盖率统计没有意义,故排除,避免拉低核心计算逻辑(scoring.ts/validation.ts)的
 * 真实覆盖率数字,干扰 docs/04-engineering/CODING-STANDARDS.md 第2节 ≥90% 覆盖率目标的判断。
 */
export default defineConfig({
  test: {
    coverage: {
      include: ['src/**/*.ts'],
      exclude: ['src/index.ts', 'src/types.ts', 'src/**/*.test.ts'],
    },
  },
});
