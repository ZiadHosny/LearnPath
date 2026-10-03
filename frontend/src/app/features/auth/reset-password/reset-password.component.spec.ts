import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router, provideRouter } from '@angular/router';
import { ResetPasswordComponent } from './reset-password.component';

describe('ResetPasswordComponent', () => {
  let fixture: ComponentFixture<ResetPasswordComponent>;
  let el: HTMLElement;
  let backend: HttpTestingController;
  let router: Router;
  let snack: { open: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    snack = { open: vi.fn() };
    await TestBed.configureTestingModule({
      imports: [ResetPasswordComponent],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: MatSnackBar, useValue: snack },
      ],
    }).compileComponents();
    backend = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
    vi.spyOn(router, 'navigateByUrl').mockResolvedValue(true);
    fixture = TestBed.createComponent(ResetPasswordComponent);
    fixture.componentRef.setInput('token', 'tok123');
    el = fixture.nativeElement;
    await fixture.whenStable();
  });

  afterEach(() => backend.verify());

  it('US-07 S3: a valid link shows the form and a successful reset goes to login', async () => {
    backend.expectOne('/api/auth/password-reset/tok123').flush({ valid: true });
    await fixture.whenStable();

    for (const name of ['newPassword', 'confirmPassword']) {
      const input = el.querySelector<HTMLInputElement>(`input[formControlName="${name}"]`)!;
      input.value = 'newpass22';
      input.dispatchEvent(new Event('input'));
    }
    el.querySelector('form')!.dispatchEvent(new Event('submit'));

    const req = backend.expectOne('/api/auth/password-reset/confirm');
    expect(req.request.body).toEqual({
      token: 'tok123',
      newPassword: 'newpass22',
      confirmPassword: 'newpass22',
    });
    req.flush(null, { status: 204, statusText: 'No Content' });
    await fixture.whenStable();

    expect(snack.open).toHaveBeenCalledWith('Password changed', undefined, expect.anything());
    expect(router.navigateByUrl).toHaveBeenCalledWith('/login');
  });

  it('US-07 S4: a used or expired link shows "Link expired" and a way to ask again', async () => {
    backend
      .expectOne('/api/auth/password-reset/tok123')
      .flush({ error: { code: 'LINK_EXPIRED', message: 'Link expired' } }, { status: 410, statusText: 'Gone' });
    await fixture.whenStable();

    expect(el.textContent).toContain('Link expired');
    expect(el.querySelector('form')).toBeNull();
    expect(el.querySelector('a[href="/forgot-password"]')).toBeTruthy();
  });
});
