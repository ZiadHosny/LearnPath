import { Injectable, type LoggerService } from '@nestjs/common';
import { styleText } from 'node:util';
import {
  DEFAULT_LEVEL_STYLES,
  LEVEL_RANK,
  PART_STYLES,
  type LevelStyle,
  type LoggerOptions,
  type LogLevel,
} from './logger.config.js';

// Extra information for one line: where it came from, which user story, and any fields.
// Never put passwords, tokens, cookies or email addresses in here.
export interface LogMeta {
  context?: string;
  story?: string;
  [field: string]: unknown;
}

interface Parsed {
  context?: string;
  story?: string;
  stack?: string;
  fields: Record<string, unknown>;
}

const DEFAULTS: LoggerOptions = { level: 'log', colors: false, format: 'pretty', styles: {} };

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value) && !(value instanceof Error);
}

function looksLikeStack(value: string): boolean {
  return /\n\s+at /.test(value);
}

function pad(n: number, size = 2): string {
  return String(n).padStart(size, '0');
}

function formatTime(d: Date): string {
  return (
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ` +
    `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}.${pad(d.getMilliseconds(), 3)}`
  );
}

// The one application logger. NestJS uses it through app.useLogger(); our code injects it.
// Accepts both the NestJS form log(message, 'Context') and log(message, { context, story, ... }).
@Injectable()
export class AppLogger implements LoggerService {
  private options: LoggerOptions;

  constructor(options: Partial<LoggerOptions> = {}) {
    this.options = { ...DEFAULTS, ...options };
  }

  configure(options: Partial<LoggerOptions>): void {
    this.options = {
      ...this.options,
      ...options,
      styles: { ...this.options.styles, ...options.styles },
    };
  }

  error(message: unknown, ...params: unknown[]): void {
    this.write('error', message, params);
  }

  fatal(message: unknown, ...params: unknown[]): void {
    this.write('error', message, params);
  }

  warn(message: unknown, ...params: unknown[]): void {
    this.write('warn', message, params);
  }

  success(message: unknown, ...params: unknown[]): void {
    this.write('success', message, params);
  }

  log(message: unknown, ...params: unknown[]): void {
    this.write('log', message, params);
  }

  debug(message: unknown, ...params: unknown[]): void {
    this.write('debug', message, params);
  }

  verbose(message: unknown, ...params: unknown[]): void {
    this.write('verbose', message, params);
  }

  isEnabled(level: LogLevel): boolean {
    return LEVEL_RANK[level] <= LEVEL_RANK[this.options.level];
  }

  private write(level: LogLevel, message: unknown, params: unknown[]): void {
    if (!this.isEnabled(level)) return;
    const parsed = this.parse(message, params);
    const text = message instanceof Error ? message.message : typeof message === 'string' ? message : JSON.stringify(message);
    const time = (this.options.now ?? (() => new Date()))();
    const line =
      this.options.format === 'json'
        ? this.json(level, time, text, parsed)
        : this.pretty(level, time, text, parsed);
    (this.options.sink ?? defaultSink)(line, level);
  }

  private parse(message: unknown, params: unknown[]): Parsed {
    const parsed: Parsed = { fields: {} };
    if (message instanceof Error) parsed.stack = message.stack;
    for (const param of params) {
      if (typeof param === 'string') {
        if (looksLikeStack(param)) parsed.stack = param;
        else parsed.context = param;
      } else if (param instanceof Error) {
        parsed.stack = param.stack;
      } else if (isPlainObject(param)) {
        const { context, story, ...fields } = param as LogMeta;
        if (context) parsed.context = context;
        if (story) parsed.story = story;
        Object.assign(parsed.fields, fields);
      }
    }
    return parsed;
  }

  private style(level: LogLevel): LevelStyle {
    return { ...DEFAULT_LEVEL_STYLES[level], ...this.options.styles[level] };
  }

  private paint(format: Parameters<typeof styleText>[0], text: string): string {
    return this.options.colors ? styleText(format, text, { validateStream: false }) : text;
  }

  private pretty(level: LogLevel, time: Date, message: string, parsed: Parsed): string {
    const style = this.style(level);
    const parts = [
      this.paint(PART_STYLES.time, formatTime(time)),
      this.paint(style.color, style.label.padEnd(7)),
    ];
    if (parsed.context) parts.push(this.paint(PART_STYLES.context, `[${parsed.context}]`));
    if (parsed.story) parts.push(this.paint(PART_STYLES.story, `[${parsed.story}]`));
    const emphasise = level === 'error' || level === 'success';
    parts.push(emphasise ? this.paint(style.color, message) : message);

    const fields = Object.entries(parsed.fields)
      .map(([key, value]) => `${key}=${typeof value === 'string' ? value : JSON.stringify(value)}`)
      .join(' ');
    if (fields) parts.push(this.paint(PART_STYLES.fields, fields));

    const line = parts.join(' ');
    return parsed.stack ? `${line}\n${this.paint(PART_STYLES.fields, parsed.stack)}` : line;
  }

  private json(level: LogLevel, time: Date, message: string, parsed: Parsed): string {
    return JSON.stringify({
      time: time.toISOString(),
      level,
      ...(parsed.context ? { context: parsed.context } : {}),
      ...(parsed.story ? { story: parsed.story } : {}),
      message,
      ...parsed.fields,
      ...(parsed.stack ? { stack: parsed.stack } : {}),
    });
  }
}

function defaultSink(line: string, level: LogLevel): void {
  const stream = level === 'error' || level === 'warn' ? process.stderr : process.stdout;
  stream.write(`${line}\n`);
}
