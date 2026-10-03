import 'dotenv/config';
import { z } from 'zod';

const booleanString = z
  .enum(['true', 'false'])
  .default('false')
  .transform((value) => value === 'true');

const envSchema = z.object({
  PORT: z.coerce.number().int().positive().default(3000),
  DATABASE_URL: z.string().min(1),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  ACCESS_TOKEN_TTL_SECONDS: z.coerce.number().int().positive().default(900),
  SESSION_TTL_DAYS: z.coerce.number().int().positive().default(7),
  RESET_TOKEN_TTL_MINUTES: z.coerce.number().int().positive().default(60),
  BCRYPT_COST: z.coerce.number().int().min(4).max(15).default(12),
  SMTP_HOST: z.string().default('localhost'),
  SMTP_PORT: z.coerce.number().int().positive().default(1025),
  MAIL_FROM: z.string().default('LearnPath <no-reply@learnpath.local>'),
  APP_URL: z.url().default('http://localhost:4200'),
  COOKIE_SECURE: booleanString,
  SEED_PASSWORD: z.string().default('Passw0rd!'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('Invalid environment configuration:', z.prettifyError(parsed.error));
  process.exit(1);
}

export const env = parsed.data;
export type Env = typeof env;
