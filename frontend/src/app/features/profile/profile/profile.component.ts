import { Component, OnInit, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { messageFor } from '../../../core/api/api-error';
import { User } from '../../../core/auth/auth.models';
import { AuthService } from '../../../core/auth/auth.service';
import { ProfileService } from '../profile.service';

const MAX_PHOTO_BYTES = 2 * 1024 * 1024;
const PHOTO_TYPES = ['image/jpeg', 'image/png'];
export const PHOTO_LIMITS_MESSAGE = 'Photo must be a JPG or PNG image of 2 MB or less';

@Component({
  selector: 'app-profile',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './profile.component.html',
  styleUrl: './profile.component.scss',
})
export class ProfileComponent implements OnInit {
  private readonly profile = inject(ProfileService);
  private readonly auth = inject(AuthService);
  private readonly snackBar = inject(MatSnackBar);

  protected readonly me = signal<User | null>(null);
  protected readonly loading = signal(true);
  protected readonly loadError = signal<string | null>(null);
  protected readonly saving = signal(false);
  protected readonly uploading = signal(false);
  protected readonly formError = signal<string | null>(null);
  protected readonly photoError = signal<string | null>(null);

  protected readonly form = inject(NonNullableFormBuilder).group({
    fullName: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(100)]],
    bio: ['', [Validators.maxLength(500)]],
  });

  ngOnInit(): void {
    this.load();
  }

  protected load(): void {
    this.loading.set(true);
    this.loadError.set(null);
    this.profile
      .getMe()
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (user) => this.show(user),
        error: (error) => this.loadError.set(messageFor(error)),
      });
  }

  protected save(): void {
    this.form.markAllAsTouched();
    if (this.form.invalid || this.saving()) return;

    const { fullName, bio } = this.form.getRawValue();
    this.saving.set(true);
    this.formError.set(null);
    this.profile
      .update({ fullName: fullName.trim(), bio: bio.trim() || null })
      .pipe(finalize(() => this.saving.set(false)))
      .subscribe({
        next: (user) => {
          this.show(user);
          this.snackBar.open('Profile updated', undefined, { duration: 3000 });
        },
        error: (error) => this.formError.set(messageFor(error)),
      });
  }

  protected onPhotoSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;

    // Client-side check for a quick answer; the server checks the real content again.
    if (!PHOTO_TYPES.includes(file.type) || file.size > MAX_PHOTO_BYTES) {
      this.photoError.set(PHOTO_LIMITS_MESSAGE);
      return;
    }

    this.photoError.set(null);
    this.uploading.set(true);
    this.profile
      .uploadPhoto(file)
      .pipe(finalize(() => this.uploading.set(false)))
      .subscribe({
        next: (user) => {
          this.show(user);
          this.snackBar.open('Profile updated', undefined, { duration: 3000 });
        },
        error: (error) => this.photoError.set(messageFor(error)),
      });
  }

  private show(user: User): void {
    this.me.set(user);
    this.auth.user.set(user);
    this.form.reset({ fullName: user.fullName, bio: user.bio ?? '' });
  }
}
