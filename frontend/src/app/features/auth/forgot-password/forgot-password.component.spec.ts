import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { ForgotPasswordComponent } from './forgot-password.component';

const CONFIRMATION = 'If an account exists for this email, a reset link has been sent.';

describe('ForgotPasswordComponent', () => {
  it.each(['known@example.com', 'unknown@example.com'])(
    'US-07 S1: always shows the same confirmation (%s)',
    async (email) => {
      await TestBed.configureTestingModule({
        imports: [ForgotPasswordComponent],
        providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
      }).compileComponents();
      const fixture = TestBed.createComponent(ForgotPasswordComponent);
      const el = fixture.nativeElement as HTMLElement;
      await fixture.whenStable();

      const input = el.querySelector<HTMLInputElement>('input[formControlName="email"]')!;
      input.value = email;
      input.dispatchEvent(new Event('input'));
      el.querySelector('form')!.dispatchEvent(new Event('submit'));

      const req = TestBed.inject(HttpTestingController).expectOne('/api/auth/password-reset/request');
      expect(req.request.body).toEqual({ email });
      req.flush({ message: CONFIRMATION }, { status: 202, statusText: 'Accepted' });
      await fixture.whenStable();

      expect(el.textContent).toContain(CONFIRMATION);
    },
  );
});
