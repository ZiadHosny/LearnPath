import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { AuthResponse } from './auth.models';
import { authInterceptor } from './auth.interceptor';
import { AuthService } from './auth.service';

const user = {
  id: 'u1',
  fullName: 'Ali',
  email: 'ali@example.com',
  role: 'STUDENT' as const,
  photoUrl: null,
  bio: null,
};

function authResponse(token: string): AuthResponse {
  return { accessToken: token, expiresIn: 900, user };
}

describe('authInterceptor', () => {
  let http: HttpClient;
  let backend: HttpTestingController;
  let auth: AuthService;
  let router: Router;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
      ],
    });
    http = TestBed.inject(HttpClient);
    backend = TestBed.inject(HttpTestingController);
    auth = TestBed.inject(AuthService);
    router = TestBed.inject(Router);
    vi.spyOn(router, 'navigate').mockResolvedValue(true);
  });

  afterEach(() => backend.verify());

  it('US-02 S6: adds the bearer token to API calls when logged in', () => {
    auth.setSession(authResponse('token-1'));
    http.get('/api/users/me').subscribe();
    const req = backend.expectOne('/api/users/me');
    expect(req.request.headers.get('Authorization')).toBe('Bearer token-1');
    req.flush(user);
  });

  it('US-02 S6: sends no bearer token when logged out, and none to non-API URLs', () => {
    http.get('/api/users/me').subscribe({ error: () => undefined });
    const api = backend.expectOne('/api/users/me');
    expect(api.request.headers.has('Authorization')).toBe(false);
    api.flush(user);

    auth.setSession(authResponse('token-1'));
    http.get('https://fonts.example.com/x.css').subscribe();
    const external = backend.expectOne('https://fonts.example.com/x.css');
    expect(external.request.headers.has('Authorization')).toBe(false);
    external.flush('');
  });

  it('US-02 S6: does not try to renew when an /api/auth/* call fails', () => {
    auth.setSession(authResponse('token-1'));
    let status = 0;
    http.post('/api/auth/login', {}).subscribe({ error: (e) => (status = e.status) });
    backend.expectOne('/api/auth/login').flush({}, { status: 401, statusText: 'Unauthorized' });
    backend.expectNone('/api/auth/refresh');
    expect(status).toBe(401);
  });

  it('US-02 edge: two requests hitting 401 share one renewal and are both retried', () => {
    auth.setSession(authResponse('old'));
    const results: unknown[] = [];
    http.get('/api/a').subscribe((r) => results.push(r));
    http.get('/api/b').subscribe((r) => results.push(r));

    backend.expectOne('/api/a').flush({}, { status: 401, statusText: 'Unauthorized' });
    backend.expectOne('/api/b').flush({}, { status: 401, statusText: 'Unauthorized' });

    const refresh = backend.match('/api/auth/refresh');
    expect(refresh.length).toBe(1);
    refresh[0].flush(authResponse('new'));

    const a = backend.expectOne('/api/a');
    const b = backend.expectOne('/api/b');
    expect(a.request.headers.get('Authorization')).toBe('Bearer new');
    expect(b.request.headers.get('Authorization')).toBe('Bearer new');
    a.flush('A');
    b.flush('B');
    expect(results).toEqual(['A', 'B']);
  });

  it('US-02 FR-011: when renewal fails the user is logged out and sent to login', () => {
    auth.setSession(authResponse('old'));
    http.get('/api/a').subscribe({ error: () => undefined });
    backend.expectOne('/api/a').flush({}, { status: 401, statusText: 'Unauthorized' });
    backend
      .expectOne('/api/auth/refresh')
      .flush({ error: { code: 'SESSION_EXPIRED' } }, { status: 401, statusText: 'Unauthorized' });

    expect(auth.isLoggedIn()).toBe(false);
    expect(router.navigate).toHaveBeenCalledWith(['/login'], { queryParams: {} });
  });

  it('US-02 S8: a blocked account during renewal is sent to login with "Account blocked"', () => {
    auth.setSession(authResponse('old'));
    http.get('/api/a').subscribe({ error: () => undefined });
    backend.expectOne('/api/a').flush({}, { status: 401, statusText: 'Unauthorized' });
    backend
      .expectOne('/api/auth/refresh')
      .flush({ error: { code: 'ACCOUNT_BLOCKED' } }, { status: 403, statusText: 'Forbidden' });

    expect(auth.isLoggedIn()).toBe(false);
    expect(router.navigate).toHaveBeenCalledWith(['/login'], { queryParams: { reason: 'blocked' } });
  });
});
