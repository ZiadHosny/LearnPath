import fs from 'node:fs';
import path from 'node:path';

// US3 / FR-016 / FR-017 / SC-007: one NestJS structure, nothing left of the Express version.
const root = path.resolve(import.meta.dirname, '../..');
const src = path.join(root, 'src');
const exists = (relative: string) => fs.existsSync(path.join(root, relative));

function filesUnder(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return entry.name === 'generated' ? [] : filesUnder(full);
    return entry.name.endsWith('.ts') ? [full] : [];
  });
}

describe('US3 project structure', () => {
  it.each(['auth', 'users', 'password-reset'])(
    'feature module %s has its module, controller, service and dto folder',
    (name) => {
      const dir = `src/modules/${name}`;
      for (const file of [`${name}.module.ts`, `${name}.controller.ts`, `${name}.service.ts`]) {
        expect(exists(`${dir}/${file}`)).toBe(true);
      }
      expect(exists(`${dir}/dto`)).toBe(true);
    },
  );

  it('shared pieces live in common/', () => {
    for (const file of [
      'src/common/guards/jwt-auth.guard.ts',
      'src/common/guards/roles.guard.ts',
      'src/common/filters/all-exceptions.filter.ts',
      'src/common/pipes/validation.pipe.ts',
      'src/prisma/prisma.module.ts',
      'src/mail/mail.module.ts',
    ]) {
      expect(exists(file)).toBe(true);
    }
  });

  it('no Express-era files remain', () => {
    for (const gone of [
      'src/app.ts',
      'src/server.ts',
      'src/middleware',
      'src/docs',
      'src/db',
      'src/config/env.ts',
      'src/lib/mailer.ts',
    ]) {
      expect({ path: gone, exists: exists(gone) }).toEqual({ path: gone, exists: false });
    }
    const leftovers = filesUnder(path.join(src, 'modules')).filter((file) =>
      /\.(routes|schemas)\.ts$/.test(file),
    );
    expect(leftovers).toEqual([]);
  });

  it('no code imports express Router or zod', () => {
    const files = [...filesUnder(src), ...filesUnder(path.join(root, 'tests'))].filter(
      (file) => file !== import.meta.filename, // this file mentions the forbidden names in its patterns
    );
    const offenders = files.filter((file) => {
      const text = fs.readFileSync(file, 'utf8');
      return /from 'zod'|\bRouter\(\)|import \{[^}]*\bRouter\b[^}]*\} from 'express'/.test(text);
    });
    expect(offenders.map((file) => path.relative(root, file))).toEqual([]);
  });

  it('zod is not a dependency any more', () => {
    const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
    const deps = { ...pkg.dependencies, ...pkg.devDependencies };
    expect(Object.keys(deps).filter((name) => name === 'zod')).toEqual([]);
  });
});

// TS-02 (003 FR-002 – FR-006): set up like a fresh NestJS 12 project.
describe('TS-02 NestJS 12 defaults', () => {
  const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
  const deps = { ...pkg.dependencies, ...pkg.devDependencies };
  const scripts: Record<string, string> = pkg.scripts;

  it('is an ES module project', () => {
    expect(pkg.type).toBe('module');
  });

  it('runs tests on Vitest, with no Jest left', () => {
    expect(deps.vitest).toBeDefined();
    expect(Object.keys(deps).filter((name) => /^(jest|@swc\/jest|@types\/jest|ts-jest)$/.test(name))).toEqual([]);
    expect(exists('jest.config.js')).toBe(false);
  });

  it('uses no experimental Node flags in any script', () => {
    expect(Object.entries(scripts).filter(([, cmd]) => cmd.includes('experimental'))).toEqual([]);
  });

  it('has the standard NestJS 12 scripts and keeps the short names', () => {
    for (const name of [
      'start:dev', 'start:debug', 'start:prod', 'test:watch', 'test:cov', 'test:e2e', 'format',
      'dev', 'start', 'test', 'build', 'lint', 'openapi',
    ]) {
      expect({ name, defined: name in scripts }).toEqual({ name, defined: true });
    }
  });

  it('has rxjs as a direct dependency', () => {
    expect(pkg.dependencies.rxjs).toBeDefined();
  });
});
