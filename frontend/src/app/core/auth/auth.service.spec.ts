import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { AuthService } from './auth.service';

const response = {
  accessToken: 'tok',
  expiresIn: 900,
  user: { id: 'u1', fullName: 'Ali', email: 'a@x.com', role: 'ADMIN' as const, photoUrl: null, bio: null },
};

describe('AuthService', () => {
  let auth: AuthService;
  let backend: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    auth = TestBed.inject(AuthService);
    backend = TestBed.inject(HttpTestingController);
  });

  afterEach(() => backend.verify());

  it('US-02 S6: restore() renews from the cookie once and signs the user in', async () => {
    const done = firstValueFrom(auth.restore());
    backend.expectOne({ method: 'POST', url: '/api/auth/refresh' }).flush(response);
    await done;
    expect(auth.user()?.role).toBe('ADMIN');
    expect(auth.accessToken()).toBe('tok');
  });

  it('US-02 S6: restore() leaves a guest signed out when there is no valid cookie', async () => {
    const done = firstValueFrom(auth.restore());
    backend
      .expectOne('/api/auth/refresh')
      .flush({ error: { code: 'SESSION_EXPIRED' } }, { status: 401, statusText: 'Unauthorized' });
    await done;
    expect(auth.isLoggedIn()).toBe(false);
  });

  it('US-02 edge: concurrent refresh() calls send a single request', async () => {
    const a = firstValueFrom(auth.refresh());
    const b = firstValueFrom(auth.refresh());
    backend.expectOne('/api/auth/refresh').flush(response);
    expect(await a).toBe('tok');
    expect(await b).toBe('tok');
  });

  it('US-02 S1: login() stores the session and returns the user', async () => {
    const done = firstValueFrom(auth.login('a@x.com', 'abc12345'));
    const req = backend.expectOne({ method: 'POST', url: '/api/auth/login' });
    expect(req.request.body).toEqual({ email: 'a@x.com', password: 'abc12345' });
    req.flush(response);
    expect((await done).role).toBe('ADMIN');
    expect(auth.isLoggedIn()).toBe(true);
  });
});
