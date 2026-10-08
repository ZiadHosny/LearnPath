import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router, provideRouter } from '@angular/router';
import { Observable, of, throwError } from 'rxjs';
import { AuthService } from '../../../core/auth/auth.service';
import { CategoriesService } from '../../../core/categories/categories.service';
import { Course, CoursesService } from '../courses.service';
import { CourseFormComponent } from './course-form.component';

const course: Course = {
  id: 'k1',
  title: 'Angular from zero',
  shortDescription: 'Build real apps',
  description: null,
  learningOutcomes: ['Components', 'Signals'],
  level: 'BEGINNER',
  category: { id: 'c1', name: 'Web' },
  thumbnailUrl: null,
  status: 'DRAFT',
  ownerId: 'u1',
  createdAt: '2026-10-08T12:00:00.000Z',
  updatedAt: '2026-10-08T12:00:00.000Z',
};

describe('CourseFormComponent', () => {
  let fixture: ComponentFixture<CourseFormComponent>;
  let el: HTMLElement;
  let courses: Record<'get' | 'create' | 'update' | 'uploadThumbnail', ReturnType<typeof vi.fn>>;
  let snack: { open: ReturnType<typeof vi.fn> };

  async function setup(id?: string, loaded: Observable<Course> = of(course)) {
    courses = {
      get: vi.fn().mockReturnValue(loaded),
      create: vi.fn(),
      update: vi.fn(),
      uploadThumbnail: vi.fn(),
    };
    snack = { open: vi.fn() };
    await TestBed.configureTestingModule({
      imports: [CourseFormComponent],
      providers: [
        provideRouter([]),
        { provide: CoursesService, useValue: courses },
        { provide: CategoriesService, useValue: { list: () => of([{ id: 'c1', name: 'Web', courseCount: 1 }]) } },
        { provide: AuthService, useValue: { role: () => 'INSTRUCTOR' } },
        { provide: MatSnackBar, useValue: snack },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(CourseFormComponent);
    if (id) fixture.componentRef.setInput('id', id);
    el = fixture.nativeElement;
    await fixture.whenStable();
  }

  interface FormAccess {
    form: { patchValue(value: object): void };
    addOutcome(value?: string): void;
  }
  const component = () => fixture.componentInstance as unknown as FormAccess;

  function type(selector: string, value: string) {
    const input = el.querySelector<HTMLInputElement | HTMLTextAreaElement>(selector)!;
    input.value = value;
    input.dispatchEvent(new Event('input'));
  }

  async function submit() {
    el.querySelector('form')!.dispatchEvent(new Event('submit'));
    await fixture.whenStable();
  }

  function selectFile(file: File) {
    const input = el.querySelector<HTMLInputElement>('input[type="file"]')!;
    Object.defineProperty(input, 'files', { value: [file], configurable: true });
    input.dispatchEvent(new Event('change'));
  }

  it('US-12 S1: creates a Draft and opens its edit page', async () => {
    await setup();
    const router = TestBed.inject(Router);
    const navigate = vi.spyOn(router, 'navigate').mockResolvedValue(true);
    courses.create.mockReturnValue(of(course));

    type('input[formControlName="title"]', '  Angular from zero ');
    type('textarea[formControlName="shortDescription"]', 'Build real apps');
    component().form.patchValue({ categoryId: 'c1', level: 'BEGINNER' });
    const outcome = el.querySelector<HTMLInputElement>('.outcome input')!;
    outcome.value = ' Components ';
    outcome.dispatchEvent(new Event('input'));
    component().addOutcome('   ');
    await submit();

    expect(courses.create).toHaveBeenCalledWith({
      title: 'Angular from zero',
      shortDescription: 'Build real apps',
      description: null,
      categoryId: 'c1',
      level: 'BEGINNER',
      learningOutcomes: ['Components'],
    });
    expect(snack.open).toHaveBeenCalledWith('Draft created', undefined, expect.anything());
    expect(navigate).toHaveBeenCalledWith(['/my-courses', 'k1', 'edit']);
  });

  it('US-12 S2: missing required fields are shown and nothing is sent', async () => {
    await setup();
    type('input[formControlName="title"]', '   ');
    await submit();
    expect(courses.create).not.toHaveBeenCalled();
    expect(el.textContent).toContain('Title must be 1–120 characters');
    expect(el.textContent).toContain('Short description must be 1–250 characters');
    expect(el.textContent).toContain('Choose a category');
    expect(el.textContent).toContain('Choose a level');
  });

  it('US-12 S2: server field errors are listed', async () => {
    await setup();
    courses.create.mockReturnValue(
      throwError(
        () =>
          new HttpErrorResponse({
            status: 400,
            error: {
              error: {
                code: 'VALIDATION_ERROR',
                message: 'Validation failed',
                details: [{ field: 'categoryId', message: 'Choose an existing category' }],
              },
            },
          }),
      ),
    );
    type('input[formControlName="title"]', 'T');
    type('textarea[formControlName="shortDescription"]', 'S');
    component().form.patchValue({ categoryId: 'c1', level: 'BEGINNER' });
    await submit();
    expect(el.querySelector('[role="alert"]')!.textContent).toContain('Choose an existing category');
  });

  it('US-12: the outcome list stops at 10 items', async () => {
    await setup();
    for (let i = 0; i < 12; i++) {
      el.querySelector<HTMLButtonElement>('[data-test="add-outcome"]')?.click();
      await fixture.whenStable();
    }
    expect(el.querySelectorAll('.outcome').length).toBe(10);
    expect(el.querySelector('[data-test="add-outcome"]')).toBeNull();
  });

  it('US-14 S1: loads the course, saves changes and shows "Course saved"', async () => {
    await setup('k1');
    expect(courses.get).toHaveBeenCalledWith('k1');
    expect(el.querySelector<HTMLInputElement>('input[formControlName="title"]')!.value).toBe('Angular from zero');
    expect(el.querySelectorAll('.outcome').length).toBe(2);

    courses.update.mockReturnValue(of({ ...course, title: 'Angular, the full course' }));
    type('input[formControlName="title"]', 'Angular, the full course');
    await submit();
    expect(courses.update).toHaveBeenCalledWith('k1', expect.objectContaining({ title: 'Angular, the full course', learningOutcomes: ['Components', 'Signals'] }));
    expect(snack.open).toHaveBeenCalledWith('Course saved', undefined, expect.anything());
  });

  it('US-14 S4: an unknown course shows "Course not found"', async () => {
    const notFound = new HttpErrorResponse({ status: 404, error: { error: { code: 'NOT_FOUND', message: 'Not found' } } });
    await setup('missing', throwError(() => notFound));
    expect(el.querySelector('[role="alert"]')!.textContent).toContain('Course not found');
    expect(el.querySelector('form')).toBeNull();
  });

  it('US-14 S5: uploads a thumbnail in edit mode; a big file is refused first', async () => {
    await setup('k1');
    selectFile(new File([new Uint8Array(3 * 1024 * 1024)], 'big.png', { type: 'image/png' }));
    await fixture.whenStable();
    expect(courses.uploadThumbnail).not.toHaveBeenCalled();
    expect(el.querySelector('[data-test="thumbnail-error"]')!.textContent).toContain('Thumbnail must be a JPG or PNG');

    courses.uploadThumbnail.mockReturnValue(of({ ...course, thumbnailUrl: '/uploads/thumbnails/k1-new.png' }));
    selectFile(new File([new Uint8Array(10)], 'cover.png', { type: 'image/png' }));
    await fixture.whenStable();
    expect(courses.uploadThumbnail).toHaveBeenCalledWith('k1', expect.any(File));
    expect(el.querySelector<HTMLImageElement>('img.thumbnail')!.getAttribute('src')).toBe('/uploads/thumbnails/k1-new.png');
  });

  it('US-12: no thumbnail upload before the draft exists', async () => {
    await setup();
    expect(el.querySelector('input[type="file"]')).toBeNull();
    expect(el.textContent).toContain('You can add a thumbnail after creating the draft.');
  });
});
