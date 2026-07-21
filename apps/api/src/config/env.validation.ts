import { z } from 'zod';

/**
 * 环境变量 Schema。启动时校验失败直接 fail-fast,
 * 对应 docs/02-architecture/ARCHITECTURE.md 第 7 节"环境变量管理"要求。
 */
export const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL 不能为空'),
  REDIS_URL: z.string().min(1, 'REDIS_URL 不能为空'),
});

export type EnvConfig = z.infer<typeof envSchema>;

export function validateEnv(config: Record<string, unknown>): EnvConfig {
  const parsed = envSchema.safeParse(config);
  if (!parsed.success) {
    throw new Error(
      `环境变量校验失败:\n${parsed.error.issues.map((i) => `- ${i.path.join('.')}: ${i.message}`).join('\n')}`,
    );
  }
  return parsed.data;
}
