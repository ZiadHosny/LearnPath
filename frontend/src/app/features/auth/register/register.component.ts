import { Component, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { messageFor } from '../../../core/api/api-error';
import { AuthService } from '../../../core/auth/auth.service';
import { PASSWORD_RULE_MESSAGE, matchFields, passwordRule } from '../../../core/forms/validators';

@Component({
  selector: 'app-register',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './register.component.html',
})
export class RegisterComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly passwordRuleMessage = PASSWORD_RULE_MESSAGE;
  protected readonly pending = signal(false);
  protected readonly serverError = signal<string | null>(null);

  protected readonly form = inject(NonNullableFormBuilder).group(
    {
      fullName: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(100)]],
      email: ['', [Validators.required, Validators.email, Validators.maxLength(254)]],
      password: ['', [Validators.required, passwordRule]],
      confirmPassword: ['', [Validators.required]],
    },
    { validators: matchFields('password', 'confirmPassword') },
  );

  protected submit(): void {
    this.form.markAllAsTouched();
    if (this.form.invalid || this.pending()) return;

    const { fullName, email, password, confirmPassword } = this.form.getRawValue();
    this.pending.set(true);
    this.serverError.set(null);
    this.auth
      .register(fullName.trim(), email.trim(), password, confirmPassword)
      .pipe(finalize(() => this.pending.set(false)))
      .subscribe({
        next: () => void this.router.navigateByUrl('/catalog'),
        error: (error) => this.serverError.set(messageFor(error)),
      });
  }
}
