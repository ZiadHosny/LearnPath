import { Component, OnInit, inject, input, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { errorCode, messageFor } from '../../../core/api/api-error';
import { PASSWORD_RULE_MESSAGE, matchFields, passwordRule } from '../../../core/forms/validators';
import { PasswordResetService } from '../password-reset.service';

type LinkState = 'checking' | 'valid' | 'expired' | 'error';

@Component({
  selector: 'app-reset-password',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './reset-password.component.html',
})
export class ResetPasswordComponent implements OnInit {
  private readonly passwordReset = inject(PasswordResetService);
  private readonly router = inject(Router);
  private readonly snackBar = inject(MatSnackBar);

  // Route param, bound by withComponentInputBinding().
  readonly token = input.required<string>();

  protected readonly passwordRuleMessage = PASSWORD_RULE_MESSAGE;
  protected readonly state = signal<LinkState>('checking');
  protected readonly pending = signal(false);
  protected readonly serverError = signal<string | null>(null);

  protected readonly form = inject(NonNullableFormBuilder).group(
    {
      newPassword: ['', [Validators.required, passwordRule]],
      confirmPassword: ['', [Validators.required]],
    },
    { validators: matchFields('newPassword', 'confirmPassword') },
  );

  ngOnInit(): void {
    this.passwordReset.check(this.token()).subscribe({
      next: () => this.state.set('valid'),
      error: (error) => {
        this.state.set(errorCode(error) === 'LINK_EXPIRED' ? 'expired' : 'error');
        this.serverError.set(messageFor(error));
      },
    });
  }

  protected submit(): void {
    this.form.markAllAsTouched();
    if (this.form.invalid || this.pending()) return;

    const { newPassword, confirmPassword } = this.form.getRawValue();
    this.pending.set(true);
    this.serverError.set(null);
    this.passwordReset
      .confirm(this.token(), newPassword, confirmPassword)
      .pipe(finalize(() => this.pending.set(false)))
      .subscribe({
        next: () => {
          this.snackBar.open('Password changed', undefined, { duration: 4000 });
          void this.router.navigateByUrl('/login');
        },
        error: (error) => {
          if (errorCode(error) === 'LINK_EXPIRED') this.state.set('expired');
          this.serverError.set(messageFor(error));
        },
      });
  }
}
