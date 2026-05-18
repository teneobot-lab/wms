import { z } from 'zod';

const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  JWT_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32),
  JWT_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),
  PORT: z.string().default('3002').transform(Number),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  BCRYPT_ROUNDS: z.string().default('12').transform(Number),
  RATE_LIMIT_WINDOW_MS: z.string().default('900000').transform(Number),
  RATE_LIMIT_MAX: z.string().default('200').transform(Number),
  CORS_ORIGIN: z.string().default('http://localhost:3000'),
});

function parseEnv() {
  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    const errors = result.error.issues.map(i => `${i.path.join('.')}: ${i.message}`);
    throw new Error(`Invalid environment variables:\n${errors.join('\n')}`);
  }
  return result.data;
}

export const env = parseEnv();