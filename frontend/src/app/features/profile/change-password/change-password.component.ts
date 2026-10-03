import { Component, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { messageFor } from '../../../core/api/api-error';
import { PASSWORD_RULE_MESSAGE, matchFields, passwordRule } from '../../../core/forms/validators';
import { ProfileService } from '../profile.service';

@Component({
  selector: 'app-change-password',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './change-password.component.html',
})
export class ChangePasswordComponent {
  private readonly profile = inject(ProfileService);
  private readonly snackBar = inject(MatSnackBar);

  protected readonly passwordRuleMessage = PASSWORD_RULE_MESSAGE;
  protected readonly pending = signal(false);
  protected readonly serverError = signal<string | null>(null);

  protected readonly form = inject(NonNullableFormBuilder).group(
    {
      currentPassword: ['', [Validators.required]],
      newPassword: ['', [Validators.required, passwordRule]],
      confirmPassword: ['', [Validators.required]],
    },
    { validators: matchFields('newPassword', 'confirmPassword') },
  );

  protected submit(): void {
    this.form.markAllAsTouched();
    if (this.form.invalid || this.pending()) return;

    const { currentPassword, newPassword, confirmPassword } = this.form.getRawValue();
    this.pending.set(true);
    this.serverError.set(null);
    this.profile
      .changePassword(currentPassword, newPassword, confirmPassword)
      .pipe(finalize(() => this.pending.set(false)))
      .subscribe({
        next: () => {
          this.form.reset();
          this.snackBar.open('Password changed', undefined, { duration: 3000 });
        },
        error: (error) => this.serverError.set(messageFor(error)),
      });
  }
}
