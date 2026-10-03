import { describe, expect, it } from 'vitest';
import { api } from '../helpers/app.js';

describe('test harness', () => {
  it('unknown routes return the uniform 404 error body', async () => {
    const res = await api.get('/api/does-not-exist');
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: { code: 'NOT_FOUND', message: 'Not found' } });
  });
});
