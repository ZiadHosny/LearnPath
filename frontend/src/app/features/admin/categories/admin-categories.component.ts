import { Component, OnInit, inject, signal } from '@angular/core';
import { FormControl, NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Observable, finalize } from 'rxjs';
import { messageFor } from '../../../core/api/api-error';
import { CategoriesService, Category } from '../../../core/categories/categories.service';
import { I18nService } from '../../../core/i18n/i18n.service';
import { TranslatePipe } from '../../../core/i18n/translate.pipe';

const NAME_RULES = [Validators.required, Validators.minLength(2), Validators.maxLength(60)];

// US-27: add, rename inline, delete (refused with a message while courses use it).
@Component({
  selector: 'app-admin-categories',
  imports: [
    ReactiveFormsModule,
    TranslatePipe,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './admin-categories.component.html',
  styleUrl: './admin-categories.component.scss',
})
export class AdminCategoriesComponent implements OnInit {
  protected readonly i18n = inject(I18nService);
  private readonly categories = inject(CategoriesService);
  private readonly snackBar = inject(MatSnackBar);
  private readonly fb = inject(NonNullableFormBuilder);

  protected readonly items = signal<Category[]>([]);
  protected readonly loading = signal(true);
  protected readonly busy = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly editingId = signal<string | null>(null);

  protected readonly addForm = this.fb.group({ name: ['', NAME_RULES] });
  protected readonly renameForm = this.fb.group({ name: ['', NAME_RULES] });

  ngOnInit(): void {
    this.load();
  }

  protected load(): void {
    this.loading.set(true);
    this.categories
      .list()
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (items) => this.items.set(items),
        error: (error) => this.error.set(messageFor(error, this.i18n)),
      });
  }

  protected add(): void {
    this.trimAndTouch(this.addForm.controls.name);
    if (this.addForm.invalid || this.busy()) return;
    this.run(this.categories.create(this.addForm.getRawValue().name), 'admin.categories.added', () =>
      this.addForm.reset(),
    );
  }

  protected startRename(category: Category): void {
    this.error.set(null);
    this.renameForm.reset({ name: category.name });
    this.editingId.set(category.id);
  }

  protected cancelRename(): void {
    this.editingId.set(null);
  }

  protected saveRename(category: Category): void {
    this.trimAndTouch(this.renameForm.controls.name);
    if (this.renameForm.invalid || this.busy()) return;
    this.run(
      this.categories.rename(category.id, this.renameForm.getRawValue().name),
      'admin.categories.renamed',
      () => this.editingId.set(null),
    );
  }

  protected remove(category: Category): void {
    if (this.busy() || !confirm(this.i18n.t('admin.categories.confirmDelete', { name: category.name }))) return;
    this.run(this.categories.remove(category.id), 'admin.categories.deleted');
  }

  // Runs a change, then reloads the list so names stay sorted and counts current.
  private run(request: Observable<unknown>, doneKey: string, after?: () => void): void {
    this.busy.set(true);
    this.error.set(null);
    request.pipe(finalize(() => this.busy.set(false))).subscribe({
      next: () => {
        after?.();
        this.snackBar.open(this.i18n.t(doneKey), undefined, { duration: 3000 });
        this.load();
      },
      error: (error) => this.error.set(messageFor(error, this.i18n)),
    });
  }

  private trimAndTouch(control: FormControl<string>): void {
    control.setValue(control.value.trim());
    control.markAsTouched();
  }
}
