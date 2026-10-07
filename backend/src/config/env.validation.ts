import 'dotenv/config';
import { plainToInstance, Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsString,
  IsUrl,
  Max,
  Min,
  MinLength,
  validateSync,
} from 'class-validator';

// Same keys and defaults as the API has always used; invalid config stops the app at start-up.
export class EnvironmentVariables {
  @Type(() => Number) @IsInt() @Min(1)
  PORT = 3000;

  @IsString() @IsNotEmpty()
  DATABASE_URL!: string;

  @IsString() @MinLength(32, { message: 'JWT_SECRET must be at least 32 characters' })
  JWT_SECRET!: string;

  @Type(() => Number) @IsInt() @Min(1)
  ACCESS_TOKEN_TTL_SECONDS = 900;

  @Type(() => Number) @IsInt() @Min(1)
  SESSION_TTL_DAYS = 7;

  @Type(() => Number) @IsInt() @Min(1)
  RESET_TOKEN_TTL_MINUTES = 60;

  @Type(() => Number) @IsInt() @Min(4) @Max(15)
  BCRYPT_COST = 12;

  @IsString()
  SMTP_HOST = 'localhost';

  @Type(() => Number) @IsInt() @Min(1)
  SMTP_PORT = 1025;

  @IsString()
  MAIL_FROM = 'LearnPath <no-reply@learnpath.local>';

  @IsUrl({ require_tld: false, require_protocol: true })
  APP_URL = 'http://localhost:4200';

  @Transform(({ value }) => value === true || value === 'true')
  @IsBoolean()
  COOKIE_SECURE = false;

  @IsString()
  SEED_PASSWORD = 'Passw0rd!';

  // Logging (TS-03): lowest level printed, colors, and output format.
  @IsIn(['error', 'warn', 'success', 'log', 'debug', 'verbose'])
  LOG_LEVEL: 'error' | 'warn' | 'success' | 'log' | 'debug' | 'verbose' = 'log';

  @IsIn(['auto', 'true', 'false'])
  LOG_COLORS: 'auto' | 'true' | 'false' = 'auto';

  @IsIn(['pretty', 'json'])
  LOG_FORMAT: 'pretty' | 'json' = 'pretty';
}

export function validateEnv(raw: Record<string, unknown>): EnvironmentVariables {
  const config = plainToInstance(EnvironmentVariables, raw);
  const errors = validateSync(config, { skipMissingProperties: false });
  if (errors.length > 0) {
    const problems = errors.flatMap((e) => Object.values(e.constraints ?? {})).join('; ');
    throw new Error(`Invalid environment configuration: ${problems}`);
  }
  return config;
}

// For code that runs outside Nest's dependency injection (lib helpers, seed, scripts).
export const env = validateEnv(process.env);
