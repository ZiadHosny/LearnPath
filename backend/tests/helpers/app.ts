import supertest from 'supertest';
import { createApp, type AppOptions } from '../../src/app.js';

export function makeApi(options?: AppOptions) {
  return supertest(createApp(options));
}

export const api = makeApi();

// Returns the raw `lp_refresh=...` pair from a response, for sending back as a Cookie header.
export function refreshCookieFrom(res: { headers: Record<string, unknown> }): string | undefined {
  const cookies = res.headers['set-cookie'] as string[] | undefined;
  const cookie = cookies?.find((c) => c.startsWith('lp_refresh='));
  return cookie?.split(';')[0];
}
