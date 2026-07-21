// @ts-check
// 根级 ESLint 基础规则集(Flat Config)。
// apps/* 使用各自框架生成的配置并在数组中拼接本文件导出的 baseConfig;
// packages/* 直接复用本文件作为唯一配置来源。
// 规则来源:docs/04-engineering/CODING-STANDARDS.md 第 1 节。
import eslint from '@eslint/js';
import eslintConfigPrettier from 'eslint-config-prettier';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export const baseConfig = tseslint.config(
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  eslintConfigPrettier,
  {
    languageOptions: {
      globals: {
        ...globals.node,
      },
    },
    rules: {
      // 核心资产禁止使用 any,确需未知类型时用 unknown + 类型收窄
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      'no-console': ['warn', { allow: ['warn', 'error'] }],
    },
  },
);

export default tseslint.config(
  {
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/build/**',
      '**/.next/**',
      '**/coverage/**',
      'apps/**',
    ],
  },
  ...baseConfig,
);
