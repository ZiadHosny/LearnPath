import { HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { Role } from '../../../core/auth/auth.models';
import { AuthService } from '../../../core/auth/auth.service';
import { LoginComponent } from './login.component';

describe('LoginComponent', () => {
  let login: ReturnType<typeof vi.fn>;
  let router: Router;
  let fixture: ComponentFixture<LoginComponent>;
  let el: HTMLElement;

  beforeEach(async () => {
    login = vi.fn();
    await TestBed.configureTestingModule({
      imports: [LoginComponent],
      providers: [provideRouter([]), { provide: AuthService, useValue: { login } }],
    }).compileComponents();
    router = TestBed.inject(Router);
    vi.spyOn(router, 'navigateByUrl').mockResolvedValue(true);
    fixture = TestBed.createComponent(LoginComponent);
    el = fixture.nativeElement;
    await fixture.whenStable();
  });

  async function submitWith(email = 'a@x.com', password = 'abc12345') {
    for (const [name, value] of [
      ['email', email],
      ['password', password],
    ]) {
      const input = el.querySelector<HTMLInputElement>(`input[formControlName="${name}"]`)!;
      input.value = value;
      input.dispatchEvent(new Event('input'));
    }
    el.querySelector('form')!.dispatchEvent(new Event('submit'));
    await fixture.whenStable();
  }

  function fail(status: number, code: string, headers?: Record<string, string>) {
    login.mockReturnValue(
      throwError(
        () =>
          new HttpErrorResponse({
            status,
            error: { error: { code, message: 'x' } },
            headers: new HttpHeaders(headers),
          }),
      ),
    );
  }

  it.each([
    ['S1', 'STUDENT', '/my-learning'],
    ['S2', 'INSTRUCTOR', '/my-courses'],
    ['S3', 'ADMIN', '/admin/dashboard'],
  ] as const)('US-02 %s: a %s lands on %s', async (_s, role: Role, home) => {
    login.mockReturnValue(of({ role }));
    await submitWith();
    expect(login).toHaveBeenCalledWith('a@x.com', 'abc12345');
    expect(router.navigateByUrl).toHaveBeenCalledWith(home);
  });

  it('US-02 S1: goes back to the page that asked for login', async () => {
    fixture.componentRef.setInput('returnUrl', '/profile');
    login.mockReturnValue(of({ role: 'STUDENT' }));
    await submitWith();
    expect(router.navigateByUrl).toHaveBeenCalledWith('/profile');
  });

  it('US-02 S1: ignores a returnUrl that points outside the app', async () => {
    fixture.componentRef.setInput('returnUrl', '//evil.example.com');
    login.mockReturnValue(of({ role: 'STUDENT' }));
    await submitWith();
    expect(router.navigateByUrl).toHaveBeenCalledWith('/my-learning');
  });

  it('US-02 S4: shows the generic message on failed login', async () => {
    fail(401, 'INVALID_CREDENTIALS');
    await submitWith();
    expect(el.textContent).toContain('Invalid email or password');
    expect(router.navigateByUrl).not.toHaveBeenCalled();
  });

  it('US-02 S5: shows how long to wait when too many attempts failed', async () => {
    fail(429, 'TOO_MANY_ATTEMPTS', { 'Retry-After': '600' });
    await submitWith();
    expect(el.textContent).toContain('Too many failed attempts. Try again in 10 minutes.');
  });

  it('US-02 S7: shows "Account blocked" for a blocked account', async () => {
    fail(403, 'ACCOUNT_BLOCKED');
    await submitWith();
    expect(el.textContent).toContain('Account blocked');
  });

  it('US-02 S8: shows "Account blocked" when sent here after a blocked renewal', async () => {
    fixture.componentRef.setInput('reason', 'blocked');
    await fixture.whenStable();
    expect(el.textContent).toContain('Account blocked');
  });
});
