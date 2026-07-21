/**
 * e2e 测试环境的最小可用环境变量,满足 src/config/env.validation.ts 的必填校验。
 * 不连接真实数据库/Redis,仅用于让应用能够完成启动(bootstrap)以测试不依赖 DB 的路由(如 /health)。
 */
process.env.NODE_ENV = process.env.NODE_ENV ?? 'test';
process.env.DATABASE_URL =
  process.env.DATABASE_URL ?? 'postgresql://test:test@localhost:5432/test?schema=public';
process.env.REDIS_URL = process.env.REDIS_URL ?? 'redis://localhost:6379';
