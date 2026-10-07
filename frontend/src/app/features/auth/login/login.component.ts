import { Component, computed, inject, input, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { messageFor } from '../../../core/api/api-error';
import { I18nService } from '../../../core/i18n/i18n.service';
import { TranslatePipe } from '../../../core/i18n/translate.pipe';
import { AuthService } from '../../../core/auth/auth.service';
import { roleHome } from '../../../core/auth/role-home';

@Component({
  selector: 'app-login',
  imports: [
    ReactiveFormsModule,
    TranslatePipe,
    RouterLink,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './login.component.html',
})
export class LoginComponent {
  protected readonly i18n = inject(I18nService);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  // Query params, bound by withComponentInputBinding().
  readonly returnUrl = input<string>();
  readonly reason = input<string>();

  protected readonly pending = signal(false);
  private readonly submitError = signal<string | null>(null);
  protected readonly error = computed(
    () => this.submitError() ?? (this.reason() === 'blocked' ? this.i18n.t('errors.ACCOUNT_BLOCKED') : null),
  );

  protected readonly form = inject(NonNullableFormBuilder).group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required]],
  });

  protected submit(): void {
    this.form.markAllAsTouched();
    if (this.form.invalid || this.pending()) return;

    const { email, password } = this.form.getRawValue();
    this.pending.set(true);
    this.submitError.set(null);
    this.auth
      .login(email.trim(), password)
      .pipe(finalize(() => this.pending.set(false)))
      .subscribe({
        next: (user) => void this.router.navigateByUrl(this.safeReturnUrl() ?? roleHome(user.role)),
        error: (error) => this.submitError.set(messageFor(error, this.i18n)),
      });
  }

  // Only same-app paths, never "//host" or absolute URLs.
  private safeReturnUrl(): string | null {
    const url = this.returnUrl();
    return url && url.startsWith('/') && !url.startsWith('//') ? url : null;
  }
}
