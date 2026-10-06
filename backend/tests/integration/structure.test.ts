import fs from 'node:fs';
import path from 'node:path';

// US3 / FR-016 / FR-017 / SC-007: one NestJS structure, nothing left of the Express version.
const root = path.resolve(__dirname, '../..');
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
      'vitest.config.ts',
    ]) {
      expect({ path: gone, exists: exists(gone) }).toEqual({ path: gone, exists: false });
    }
    const leftovers = filesUnder(path.join(src, 'modules')).filter((file) =>
      /\.(routes|schemas)\.ts$/.test(file),
    );
    expect(leftovers).toEqual([]);
  });

  it('no code imports express Router, zod or vitest', () => {
    const files = [...filesUnder(src), ...filesUnder(path.join(root, 'tests'))].filter(
      (file) => file !== __filename, // this file mentions the forbidden names in its patterns
    );
    const offenders = files.filter((file) => {
      const text = fs.readFileSync(file, 'utf8');
      return /from 'zod'|from 'vitest'|\bRouter\(\)|import \{[^}]*\bRouter\b[^}]*\} from 'express'/.test(text);
    });
    expect(offenders.map((file) => path.relative(root, file))).toEqual([]);
  });

  it('zod and vitest are not dependencies any more', () => {
    const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
    const deps = { ...pkg.dependencies, ...pkg.devDependencies };
    expect(Object.keys(deps).filter((name) => ['zod', 'vitest'].includes(name))).toEqual([]);
  });
});
