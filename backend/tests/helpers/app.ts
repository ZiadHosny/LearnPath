import type { Type } from '@nestjs/common';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { Test } from '@nestjs/testing';
import supertest from 'supertest';
import { AppModule } from '../../src/app.module.js';
import { configureApp } from '../../src/app.setup.js';

let app: NestExpressApplication | undefined;

// One Nest app at a time. setup.ts starts the default app before each test file; a file that
// needs extra controllers (e.g. a @Roles test controller) calls initApp() again in its own
// beforeAll, which replaces the default app.
export async function initApp(options: { controllers?: Type[] } = {}): Promise<NestExpressApplication> {
  await closeApp();
  const moduleRef = await Test.createTestingModule({
    imports: [AppModule],
    controllers: options.controllers ?? [],
  }).compile();
  app = moduleRef.createNestApplication<NestExpressApplication>({
    bodyParser: false,
    logger: ['error', 'warn'],
  });
  configureApp(app);
  await app.init();
  return app;
}

export async function closeApp(): Promise<void> {
  if (app) {
    await app.close();
    app = undefined;
  }
}

function agent() {
  if (!app) throw new Error('initApp() has not run');
  return supertest(app.getHttpServer());
}

// Same interface as before (api.post(...)), always aimed at the current app.
export const api = {
  get: (url: string) => agent().get(url),
  post: (url: string) => agent().post(url),
  put: (url: string) => agent().put(url),
  patch: (url: string) => agent().patch(url),
  delete: (url: string) => agent().delete(url),
};

// Returns the raw `lp_refresh=...` pair from a response, for sending back as a Cookie header.
export function refreshCookieFrom(res: { headers: Record<string, unknown> }): string | undefined {
  const cookies = res.headers['set-cookie'] as string[] | undefined;
  const cookie = cookies?.find((c) => c.startsWith('lp_refresh='));
  return cookie?.split(';')[0];
}
