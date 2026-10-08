import { Component, OnInit, computed, inject, input, signal } from '@angular/core';
import { FormControl, NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { errorDetails, errorCode, messageFor } from '../../../core/api/api-error';
import { AuthService } from '../../../core/auth/auth.service';
import { CategoriesService, Category } from '../../../core/categories/categories.service';
import { notBlank } from '../../../core/forms/validators';
import { I18nService } from '../../../core/i18n/i18n.service';
import { TranslatePipe } from '../../../core/i18n/translate.pipe';
import { COURSE_LEVELS, COURSE_LIMITS, Course, CourseLevel, CoursesService } from '../courses.service';

const MAX_IMAGE_BYTES = 2 * 1024 * 1024;
const IMAGE_TYPES = ['image/jpeg', 'image/png'];
const IMAGE_ERRORS = ['FILE_TOO_LARGE', 'UNSUPPORTED_FILE_TYPE'];

// US-12 (create a Draft) and US-14 (edit details + thumbnail). Same form, same rules.
@Component({
  selector: 'app-course-form',
  imports: [
    ReactiveFormsModule,
    TranslatePipe,
    RouterLink,
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatProgressSpinnerModule,
    MatSelectModule,
  ],
  templateUrl: './course-form.component.html',
  styleUrl: './course-form.component.scss',
})
export class CourseFormComponent implements OnInit {
  // Route param of /my-courses/:id/edit; absent on /my-courses/new.
  readonly id = input<string>();

  protected readonly i18n = inject(I18nService);
  private readonly courses = inject(CoursesService);
  private readonly categoriesApi = inject(CategoriesService);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly snackBar = inject(MatSnackBar);
  private readonly fb = inject(NonNullableFormBuilder);

  protected readonly limits = COURSE_LIMITS;
  protected readonly levels = COURSE_LEVELS;
  protected readonly isEdit = computed(() => !!this.id());
  protected readonly isInstructor = computed(() => this.auth.role() === 'INSTRUCTOR');

  protected readonly categories = signal<Category[]>([]);
  protected readonly course = signal<Course | null>(null);
  protected readonly loading = signal(true);
  protected readonly loadError = signal<string | null>(null);
  protected readonly saving = signal(false);
  protected readonly uploading = signal(false);
  protected readonly formError = signal<string | null>(null);
  protected readonly fieldErrors = signal<string[]>([]);
  protected readonly thumbnailError = signal<string | null>(null);

  protected readonly form = this.fb.group({
    title: ['', [notBlank, Validators.maxLength(COURSE_LIMITS.title)]],
    shortDescription: ['', [notBlank, Validators.maxLength(COURSE_LIMITS.shortDescription)]],
    description: ['', [Validators.maxLength(COURSE_LIMITS.description)]],
    categoryId: ['', [Validators.required]],
    level: ['' as CourseLevel | '', [Validators.required]],
    learningOutcomes: this.fb.array<FormControl<string>>([]),
  });

  protected get outcomes() {
    return this.form.controls.learningOutcomes;
  }

  ngOnInit(): void {
    this.categoriesApi.list().subscribe({
      next: (items) => this.categories.set(items),
      error: (error) => this.loadError.set(messageFor(error, this.i18n)),
    });

    const id = this.id();
    if (!id) {
      this.addOutcome();
      this.loading.set(false);
      return;
    }
    this.courses
      .get(id)
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (course) => this.show(course),
        error: (error) =>
          this.loadError.set(
            errorCode(error) === 'NOT_FOUND' ? this.i18n.t('courses.form.notFound') : messageFor(error, this.i18n),
          ),
      });
  }

  protected addOutcome(value = ''): void {
    if (this.outcomes.length >= COURSE_LIMITS.outcomes) return;
    this.outcomes.push(this.fb.control(value, [Validators.maxLength(COURSE_LIMITS.outcome)]));
  }

  protected removeOutcome(index: number): void {
    this.outcomes.removeAt(index);
    this.outcomes.markAsDirty();
  }

  protected save(): void {
    this.form.markAllAsTouched();
    if (this.form.invalid || this.saving()) return;

    const value = this.form.getRawValue();
    const input = {
      title: value.title.trim(),
      shortDescription: value.shortDescription.trim(),
      description: value.description.trim() || null,
      categoryId: value.categoryId,
      level: value.level as CourseLevel,
      learningOutcomes: value.learningOutcomes.map((item) => item.trim()).filter(Boolean),
    };

    this.saving.set(true);
    this.formError.set(null);
    this.fieldErrors.set([]);
    const id = this.id();
    const request = id ? this.courses.update(id, input) : this.courses.create(input);
    request.pipe(finalize(() => this.saving.set(false))).subscribe({
      next: (course) => {
        if (id) {
          this.show(course);
          this.snackBar.open(this.i18n.t('courses.form.saved'), undefined, { duration: 3000 });
        } else {
          this.snackBar.open(this.i18n.t('courses.form.created'), undefined, { duration: 3000 });
          void this.router.navigate(['/my-courses', course.id, 'edit']);
        }
      },
      error: (error) => {
        this.formError.set(messageFor(error, this.i18n));
        this.fieldErrors.set(errorDetails(error).map((detail) => detail.message));
      },
    });
  }

  protected onThumbnailSelected(event: Event): void {
    const field = event.target as HTMLInputElement;
    const file = field.files?.[0];
    field.value = '';
    const id = this.id();
    if (!file || !id) return;

    // Quick answer here; the server checks the real content again.
    if (!IMAGE_TYPES.includes(file.type) || file.size > MAX_IMAGE_BYTES) {
      this.thumbnailError.set(this.i18n.t('courses.form.thumbnailLimits'));
      return;
    }

    this.thumbnailError.set(null);
    this.uploading.set(true);
    this.courses
      .uploadThumbnail(id, file)
      .pipe(finalize(() => this.uploading.set(false)))
      .subscribe({
        next: (course) => {
          this.course.set(course);
          this.snackBar.open(this.i18n.t('courses.form.saved'), undefined, { duration: 3000 });
        },
        error: (error) =>
          this.thumbnailError.set(
            IMAGE_ERRORS.includes(errorCode(error) ?? '')
              ? this.i18n.t('courses.form.thumbnailLimits')
              : messageFor(error, this.i18n),
          ),
      });
  }

  private show(course: Course): void {
    this.course.set(course);
    this.outcomes.clear();
    for (const item of course.learningOutcomes) this.addOutcome(item);
    if (this.outcomes.length === 0) this.addOutcome();
    this.form.reset({
      title: course.title,
      shortDescription: course.shortDescription,
      description: course.description ?? '',
      categoryId: course.category.id,
      level: course.level,
      learningOutcomes: this.outcomes.getRawValue(),
    });
  }
}
