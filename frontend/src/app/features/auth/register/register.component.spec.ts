import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { of, Subject, throwError } from 'rxjs';
import { AuthService } from '../../../core/auth/auth.service';
import { RegisterComponent } from './register.component';

describe('RegisterComponent', () => {
  let register: ReturnType<typeof vi.fn>;
  let router: Router;

  async function setup() {
    register = vi.fn();
    await TestBed.configureTestingModule({
      imports: [RegisterComponent],
      providers: [provideRouter([]), { provide: AuthService, useValue: { register } }],
    }).compileComponents();
    router = TestBed.inject(Router);
    vi.spyOn(router, 'navigateByUrl').mockResolvedValue(true);
    const fixture = TestBed.createComponent(RegisterComponent);
    await fixture.whenStable();
    return fixture;
  }

  function fill(el: HTMLElement, values: Record<string, string>) {
    for (const [name, value] of Object.entries(values)) {
      const input = el.querySelector<HTMLInputElement>(`input[formControlName="${name}"]`)!;
      input.value = value;
      input.dispatchEvent(new Event('input'));
      input.dispatchEvent(new Event('blur'));
    }
  }

  const valid = {
    fullName: 'Ali Hassan',
    email: 'ali@example.com',
    password: 'abc12345',
    confirmPassword: 'abc12345',
  };

  function submit(el: HTMLElement) {
    el.querySelector<HTMLFormElement>('form')!.dispatchEvent(new Event('submit'));
  }

  it('US-01 S3: shows an email format error and does not submit', async () => {
    const fixture = await setup();
    const el = fixture.nativeElement as HTMLElement;
    fill(el, { ...valid, email: 'not-an-email' });
    submit(el);
    await fixture.whenStable();
    expect(el.textContent).toContain('Enter a valid email');
    expect(register).not.toHaveBeenCalled();
  });

  it('US-01 S4: shows the password rule and does not submit', async () => {
    const fixture = await setup();
    const el = fixture.nativeElement as HTMLElement;
    fill(el, { ...valid, password: 'abcdefgh', confirmPassword: 'abcdefgh' });
    submit(el);
    await fixture.whenStable();
    expect(el.textContent).toContain('at least 8 characters with a letter and a number');
    expect(register).not.toHaveBeenCalled();
  });

  it('US-01 S5: shows a mismatch error when confirmation differs', async () => {
    const fixture = await setup();
    const el = fixture.nativeElement as HTMLElement;
    fill(el, { ...valid, confirmPassword: 'abc12346' });
    submit(el);
    await fixture.whenStable();
    expect(el.textContent).toContain('Passwords do not match');
    expect(register).not.toHaveBeenCalled();
  });

  it('US-01 S2: shows "Email already registered" when the server refuses the email', async () => {
    const fixture = await setup();
    const el = fixture.nativeElement as HTMLElement;
    register.mockReturnValue(
      throwError(
        () =>
          new HttpErrorResponse({
            status: 409,
            error: { error: { code: 'EMAIL_TAKEN', message: 'Email already registered' } },
          }),
      ),
    );
    fill(el, valid);
    submit(el);
    await fixture.whenStable();
    expect(el.textContent).toContain('Email already registered');
    expect(router.navigateByUrl).not.toHaveBeenCalled();
  });

  it('US-01 S1: registers and goes to the catalog', async () => {
    const fixture = await setup();
    const el = fixture.nativeElement as HTMLElement;
    register.mockReturnValue(of(undefined));
    fill(el, valid);
    submit(el);
    await fixture.whenStable();
    expect(register).toHaveBeenCalledWith('Ali Hassan', 'ali@example.com', 'abc12345', 'abc12345');
    expect(router.navigateByUrl).toHaveBeenCalledWith('/catalog');
  });

  it('US-01 S1: disables the submit button while the request is pending', async () => {
    const fixture = await setup();
    const el = fixture.nativeElement as HTMLElement;
    const pending = new Subject<void>();
    register.mockReturnValue(pending);
    fill(el, valid);
    submit(el);
    await fixture.whenStable();
    expect(el.querySelector<HTMLButtonElement>('button[type="submit"]')!.disabled).toBe(true);
    pending.next();
    pending.complete();
  });
});
