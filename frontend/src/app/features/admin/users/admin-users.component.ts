import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar } from '@angular/material/snack-bar';
import { finalize } from 'rxjs';
import { messageFor } from '../../../core/api/api-error';
import { Role } from '../../../core/auth/auth.models';
import { AuthService } from '../../../core/auth/auth.service';
import { I18nService } from '../../../core/i18n/i18n.service';
import { TranslatePipe } from '../../../core/i18n/translate.pipe';
import { AdminUser, AdminUserPage, AdminUsersService } from './admin-users.service';

const ROLES: Role[] = ['STUDENT', 'INSTRUCTOR', 'ADMIN'];

// US-26, with the small part of the US-25 list it needs: search, pages of 20, role per row.
@Component({
  selector: 'app-admin-users',
  imports: [
    FormsModule,
    TranslatePipe,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatProgressSpinnerModule,
    MatSelectModule,
  ],
  templateUrl: './admin-users.component.html',
  styleUrl: './admin-users.component.scss',
})
export class AdminUsersComponent implements OnInit {
  protected readonly i18n = inject(I18nService);
  private readonly users = inject(AdminUsersService);
  private readonly auth = inject(AuthService);
  private readonly snackBar = inject(MatSnackBar);

  protected readonly roles = ROLES;
  protected readonly myId = computed(() => this.auth.user()?.id);
  protected readonly data = signal<AdminUserPage | null>(null);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly savingId = signal<string | null>(null);
  protected readonly pages = computed(() => {
    const data = this.data();
    return data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;
  });

  protected search = '';
  private appliedSearch = '';

  ngOnInit(): void {
    this.load(1);
  }

  protected find(): void {
    this.appliedSearch = this.search.trim();
    this.load(1);
  }

  protected load(page: number): void {
    this.loading.set(true);
    this.error.set(null);
    this.users
      .list(this.appliedSearch, page)
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (data) => this.data.set(data),
        error: (error) => this.error.set(messageFor(error, this.i18n)),
      });
  }

  protected changeRole(user: AdminUser, role: Role): void {
    if (role === user.role) return;
    this.error.set(null);
    this.savingId.set(user.id);
    this.users
      .changeRole(user.id, role)
      .pipe(finalize(() => this.savingId.set(null)))
      .subscribe({
        next: (updated) => {
          this.replace(updated);
          this.snackBar.open(this.i18n.t('admin.users.roleUpdated'), undefined, { duration: 4000 });
        },
        error: (error) => {
          this.replace({ ...user }); // puts the select back to the saved role
          this.error.set(messageFor(error, this.i18n));
        },
      });
  }

  private replace(user: AdminUser): void {
    this.data.update((data) =>
      data ? { ...data, items: data.items.map((item) => (item.id === user.id ? user : item)) } : data,
    );
  }
}
