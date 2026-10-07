import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatSnackBar } from '@angular/material/snack-bar';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { AuthService } from '../../../core/auth/auth.service';
import { ProfileService } from '../profile.service';
import { ChangePasswordComponent } from './change-password.component';

describe('ChangePasswordComponent', () => {
  let fixture: ComponentFixture<ChangePasswordComponent>;
  let el: HTMLElement;
  let changePassword: ReturnType<typeof vi.fn>;
  let snack: { open: ReturnType<typeof vi.fn> };
  let auth: { logout: ReturnType<typeof vi.fn>; refresh: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    changePassword = vi.fn();
    snack = { open: vi.fn() };
    auth = { logout: vi.fn(), refresh: vi.fn() };
    await TestBed.configureTestingModule({
      imports: [ChangePasswordComponent],
      providers: [
        provideRouter([]),
        { provide: ProfileService, useValue: { changePassword } },
        { provide: MatSnackBar, useValue: snack },
        { provide: AuthService, useValue: auth },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(ChangePasswordComponent);
    el = fixture.nativeElement;
    await fixture.whenStable();
  });

  async function submit(values: Record<string, string>) {
    for (const [name, value] of Object.entries(values)) {
      const input = el.querySelector<HTMLInputElement>(`input[formControlName="${name}"]`)!;
      input.value = value;
      input.dispatchEvent(new Event('input'));
    }
    el.querySelector('form')!.dispatchEvent(new Event('submit'));
    await fixture.whenStable();
  }

  const valid = { currentPassword: 'oldpass11', newPassword: 'newpass22', confirmPassword: 'newpass22' };

  it('US-06 S1: a successful change shows "Password changed" and clears the form', async () => {
    changePassword.mockReturnValue(of(undefined));
    await submit(valid);
    expect(changePassword).toHaveBeenCalledWith('oldpass11', 'newpass22', 'newpass22');
    expect(snack.open).toHaveBeenCalledWith('Password changed', undefined, expect.anything());
    expect(el.querySelector<HTMLInputElement>('input[formControlName="newPassword"]')!.value).toBe('');
  });

  it('US-06 S2: a wrong current password shows an error and does not sign the user out', async () => {
    changePassword.mockReturnValue(
      throwError(
        () =>
          new HttpErrorResponse({
            status: 400,
            error: { error: { code: 'INVALID_CURRENT_PASSWORD', message: 'x' } },
          }),
      ),
    );
    await submit(valid);
    expect(el.textContent).toContain('Current password is incorrect');
    expect(auth.logout).not.toHaveBeenCalled();
    expect(auth.refresh).not.toHaveBeenCalled();
  });

  it('US-06 S3: the new password rule and confirmation are checked before sending', async () => {
    await submit({ ...valid, newPassword: 'abcdefgh', confirmPassword: 'abcdefgh' });
    expect(el.textContent).toContain('at least 8 characters with a letter and a number');

    await submit({ ...valid, confirmPassword: 'newpass23' });
    expect(el.textContent).toContain('Passwords do not match');
    expect(changePassword).not.toHaveBeenCalled();
  });
});
