import type { styleText } from 'node:util';

// ─── Change log styles here ─────────────────────────────────────────────────────────────────
// Each level has a label and a color (any `util.styleText` format, e.g. 'red', ['green', 'bold']).
// Code can also override them at run time: logger.configure({ styles: { success: { ... } } }).

export type LogLevel = 'error' | 'warn' | 'success' | 'log' | 'debug' | 'verbose';
type StyleFormat = Parameters<typeof styleText>[0];

export interface LevelStyle {
  label: string;
  color: StyleFormat;
}

export const DEFAULT_LEVEL_STYLES: Record<LogLevel, LevelStyle> = {
  error: { label: 'ERROR', color: 'red' },
  warn: { label: 'WARN', color: 'yellow' },
  success: { label: 'SUCCESS', color: 'green' },
  log: { label: 'LOG', color: 'cyan' },
  debug: { label: 'DEBUG', color: 'magenta' },
  verbose: { label: 'VERBOSE', color: 'gray' },
};

// Colors for the other parts of a pretty line.
export const PART_STYLES = {
  time: 'gray',
  context: 'yellow',
  story: 'blue',
  fields: 'gray',
} as const satisfies Record<string, StyleFormat>;

// Lower rank = more important. LOG_LEVEL=warn prints ranks 0–1.
export const LEVEL_RANK: Record<LogLevel, number> = {
  error: 0,
  warn: 1,
  success: 2,
  log: 3,
  debug: 4,
  verbose: 5,
};

export interface LoggerOptions {
  level: LogLevel;
  colors: boolean;
  format: 'pretty' | 'json';
  styles: Partial<Record<LogLevel, Partial<LevelStyle>>>;
  // Where finished lines go; defaults to stdout (stderr for warn/error).
  sink?: (line: string, level: LogLevel) => void;
  now?: () => Date;
}

interface LoggingEnv {
  LOG_LEVEL: LogLevel;
  LOG_COLORS: 'auto' | 'true' | 'false';
  LOG_FORMAT: 'pretty' | 'json';
}

// NO_COLOR (https://no-color.org) always wins; 'auto' means colors only in a terminal.
export function loggerOptionsFromEnv(
  env: LoggingEnv,
  processEnv: Record<string, string | undefined> = process.env,
  isTerminal: boolean = Boolean(process.stdout.isTTY),
): LoggerOptions {
  const colors =
    !processEnv.NO_COLOR &&
    (env.LOG_COLORS === 'true' || (env.LOG_COLORS === 'auto' && isTerminal));
  return { level: env.LOG_LEVEL, colors, format: env.LOG_FORMAT, styles: {} };
}
