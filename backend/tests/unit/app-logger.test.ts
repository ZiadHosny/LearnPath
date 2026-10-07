import { AppLogger } from '../../src/common/logging/app-logger.service.js';
import { loggerOptionsFromEnv, type LogLevel } from '../../src/common/logging/logger.config.js';

// Color escape sequences (ESC [ … m), built from the char code to keep the regex lint-clean.
const ESC = String.fromCharCode(27);
const ANSI = new RegExp(`${ESC}\\[[0-9;]*m`);
const strip = (text: string) => text.replace(new RegExp(`${ESC}\\[[0-9;]*m`, 'g'), '');

function capture(options: ConstructorParameters<typeof AppLogger>[0] = {}) {
  const lines: Array<{ line: string; level: LogLevel }> = [];
  const logger = new AppLogger({
    level: 'verbose',
    colors: true,
    format: 'pretty',
    now: () => new Date('2026-10-07T20:40:12.345Z'),
    sink: (line, level) => lines.push({ line, level }),
    ...options,
  });
  return { logger, lines };
}

describe('TS-03 US1 colored, readable lines', () => {
  it.each([
    ['error', '31', 'ERROR'],
    ['warn', '33', 'WARN'],
    ['success', '32', 'SUCCESS'],
    ['log', '36', 'LOG'],
    ['debug', '35', 'DEBUG'],
    ['verbose', '90', 'VERBOSE'],
  ] as const)('%s has its own color and label', (level, code, label) => {
    const { logger, lines } = capture();
    logger[level]('hello');
    expect(lines).toHaveLength(1);
    expect(lines[0].line).toContain(`\u001b[${code}m`);
    expect(strip(lines[0].line)).toContain(label);
    expect(strip(lines[0].line)).toContain('hello');
  });

  it('shows time, context, story tag and extra fields', () => {
    const { logger, lines } = capture({ colors: false });
    logger.success('User registered', { context: 'AuthService', story: 'US-01', userId: 'u1' });
    expect(lines[0].line).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}\.\d{3} /);
    expect(lines[0].line).toContain('SUCCESS');
    expect(lines[0].line).toContain('[AuthService]');
    expect(lines[0].line).toContain('[US-01]');
    expect(lines[0].line).toContain('User registered');
    expect(lines[0].line).toContain('userId=u1');
  });

  it('keeps the NestJS call form log(message, context)', () => {
    const { logger, lines } = capture({ colors: false });
    logger.log('Mapped route', 'RouterExplorer');
    expect(lines[0].line).toContain('[RouterExplorer] Mapped route');
  });

  it('prints the stack of an error after the line', () => {
    const { logger, lines } = capture({ colors: false });
    const error = new Error('boom');
    logger.error('Unhandled error', error.stack, 'Exceptions');
    expect(lines[0].line).toContain('[Exceptions] Unhandled error');
    expect(lines[0].line).toContain('Error: boom');
    expect(lines[0].level).toBe('error');
  });
});

describe('TS-03 US2 customizable', () => {
  it('hides levels below the minimum', () => {
    const { logger, lines } = capture({ level: 'warn' });
    logger.verbose('v');
    logger.debug('d');
    logger.log('l');
    logger.success('s');
    logger.warn('w');
    logger.error('e');
    expect(lines.map((l) => l.level)).toEqual(['warn', 'error']);
  });

  it('can be reconfigured at run time', () => {
    const { logger, lines } = capture({ level: 'error' });
    logger.log('hidden');
    logger.configure({ level: 'log' });
    logger.log('shown');
    expect(lines.map((l) => strip(l.line))).toEqual([expect.stringContaining('shown')]);
  });

  it('prints no color codes when colors are off', () => {
    const { logger, lines } = capture({ colors: false });
    for (const level of ['error', 'warn', 'success', 'log', 'debug', 'verbose'] as const) {
      logger[level]('x', { story: 'US-02' });
    }
    expect(lines.some((l) => ANSI.test(l.line))).toBe(false);
  });

  it('turns colors off for NO_COLOR, for LOG_COLORS=false, and for auto when not a terminal', () => {
    const base = { LOG_LEVEL: 'log', LOG_FORMAT: 'pretty' } as const;
    expect(loggerOptionsFromEnv({ ...base, LOG_COLORS: 'true' }, { NO_COLOR: '1' }, true).colors).toBe(false);
    expect(loggerOptionsFromEnv({ ...base, LOG_COLORS: 'false' }, {}, true).colors).toBe(false);
    expect(loggerOptionsFromEnv({ ...base, LOG_COLORS: 'auto' }, {}, false).colors).toBe(false);
    expect(loggerOptionsFromEnv({ ...base, LOG_COLORS: 'auto' }, {}, true).colors).toBe(true);
    expect(loggerOptionsFromEnv({ ...base, LOG_COLORS: 'true' }, {}, false).colors).toBe(true);
  });

  it('writes one JSON object per line in json format', () => {
    const { logger, lines } = capture({ format: 'json', colors: true });
    logger.success('User registered', { context: 'AuthService', story: 'US-01', userId: 'u1' });
    expect(ANSI.test(lines[0].line)).toBe(false);
    expect(JSON.parse(lines[0].line)).toEqual({
      time: '2026-10-07T20:40:12.345Z',
      level: 'success',
      context: 'AuthService',
      story: 'US-01',
      message: 'User registered',
      userId: 'u1',
    });
  });

  it('uses a custom style for a level', () => {
    const { logger, lines } = capture({ styles: { success: { label: 'DONE', color: 'blue' } } });
    logger.success('ok');
    expect(strip(lines[0].line)).toContain('DONE');
    expect(lines[0].line).toContain('\u001b[34m');
  });
});
