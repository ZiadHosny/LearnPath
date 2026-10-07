import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { Role } from './auth.models';
import { authGuard, guestGuard, roleGuard } from './auth.guards';
import { AuthService } from './auth.service';

@Component({ template: 'page' })
class PageComponent {}

describe('auth guards', () => {
  const role = signal<Role | null>(null);
  const authStub = { isLoggedIn: () => role() !== null, role };

  async function setup() {
    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: authStub },
        provideRouter([
          { path: 'protected', component: PageComponent, canActivate: [authGuard] },
          { path: 'login', component: PageComponent, canActivate: [guestGuard] },
          { path: 'my-learning', component: PageComponent, canActivate: [roleGuard('STUDENT')] },
          { path: 'my-courses', component: PageComponent, canActivate: [roleGuard('INSTRUCTOR')] },
          { path: 'admin/dashboard', component: PageComponent, canActivate: [roleGuard('ADMIN')] },
        ]),
      ],
    });
    return RouterTestingHarness.create();
  }

  beforeEach(() => role.set(null));

  it('US-03 S2: a logged-out user opening a protected page is sent to login with returnUrl', async () => {
    const harness = await setup();
    await harness.navigateByUrl('/protected');
    expect(TestBed.inject(Router).url).toBe('/login?returnUrl=%2Fprotected');
  });

  it('US-03 S2: a logged-in user can open a protected page', async () => {
    role.set('STUDENT');
    const harness = await setup();
    await harness.navigateByUrl('/protected');
    expect(TestBed.inject(Router).url).toBe('/protected');
  });

  it('US-03 guestGuard: a signed-in Student opening /login goes to My Learning', async () => {
    role.set('STUDENT');
    const harness = await setup();
    await harness.navigateByUrl('/login');
    expect(TestBed.inject(Router).url).toBe('/my-learning');
  });

  it('US-03 guestGuard: a guest can open /login', async () => {
    const harness = await setup();
    await harness.navigateByUrl('/login');
    expect(TestBed.inject(Router).url).toBe('/login');
  });

  it('US-04 S3: a guest opening a role page is sent to login', async () => {
    const harness = await setup();
    await harness.navigateByUrl('/admin/dashboard');
    expect(TestBed.inject(Router).url).toBe('/login?returnUrl=%2Fadmin%2Fdashboard');
  });

  it.each([
    ['STUDENT', '/admin/dashboard', '/my-learning'],
    ['STUDENT', '/my-courses', '/my-learning'],
    ['INSTRUCTOR', '/my-learning', '/my-courses'],
    ['ADMIN', '/my-courses', '/admin/dashboard'],
  ] as const)('US-04 S3: a %s opening %s is redirected to %s', async (r, url, home) => {
    role.set(r);
    const harness = await setup();
    await harness.navigateByUrl(url);
    expect(TestBed.inject(Router).url).toBe(home);
  });

  it.each([
    ['STUDENT', '/my-learning'],
    ['INSTRUCTOR', '/my-courses'],
    ['ADMIN', '/admin/dashboard'],
  ] as const)('US-04 S3: a %s can open their own page %s', async (r, url) => {
    role.set(r);
    const harness = await setup();
    await harness.navigateByUrl(url);
    expect(TestBed.inject(Router).url).toBe(url);
  });
});
