import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatSnackBar } from '@angular/material/snack-bar';
import { of, throwError } from 'rxjs';
import { CategoriesService, Category } from '../../../core/categories/categories.service';
import { AdminCategoriesComponent } from './admin-categories.component';

const design: Category = { id: 'c1', name: 'Design', courseCount: 3 };
const art: Category = { id: 'c2', name: 'Art', courseCount: 0 };

describe('AdminCategoriesComponent', () => {
  let fixture: ComponentFixture<AdminCategoriesComponent>;
  let el: HTMLElement;
  let service: Record<'list' | 'create' | 'rename' | 'remove', ReturnType<typeof vi.fn>>;
  let snack: { open: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    service = {
      list: vi.fn().mockReturnValue(of([art, design])),
      create: vi.fn(),
      rename: vi.fn(),
      remove: vi.fn(),
    };
    snack = { open: vi.fn() };
    await TestBed.configureTestingModule({
      imports: [AdminCategoriesComponent],
      providers: [
        { provide: CategoriesService, useValue: service },
        { provide: MatSnackBar, useValue: snack },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(AdminCategoriesComponent);
    el = fixture.nativeElement;
    await fixture.whenStable();
  });

  afterEach(() => vi.restoreAllMocks());

  function type(input: HTMLInputElement, value: string) {
    input.value = value;
    input.dispatchEvent(new Event('input'));
  }

  function button(scope: Element, text: string) {
    return [...scope.querySelectorAll('button')].find((b) => b.textContent?.trim() === text)!;
  }

  function apiError(status: number, code: string, message: string) {
    return throwError(() => new HttpErrorResponse({ status, error: { error: { code, message } } }));
  }

  it('US-27 S1: lists categories with their course counts', () => {
    expect(el.querySelector('[data-test="category-c1"]')!.textContent).toContain('Design');
    expect(el.querySelector('[data-test="category-c1"]')!.textContent).toContain('3');
  });

  it('US-27 S1: adds a category (trimmed) and reloads the list', async () => {
    service.create.mockReturnValue(of({ id: 'c3', name: 'Web', courseCount: 0 }));
    type(el.querySelector<HTMLInputElement>('form.add input')!, '  Web ');
    el.querySelector('form.add')!.dispatchEvent(new Event('submit'));
    await fixture.whenStable();
    expect(service.create).toHaveBeenCalledWith('Web');
    expect(snack.open).toHaveBeenCalledWith('Category added', undefined, expect.anything());
    expect(service.list).toHaveBeenCalledTimes(2);
  });

  it('US-27: a name shorter than 2 characters is not sent', async () => {
    type(el.querySelector<HTMLInputElement>('form.add input')!, 'A');
    el.querySelector('form.add')!.dispatchEvent(new Event('submit'));
    await fixture.whenStable();
    expect(service.create).not.toHaveBeenCalled();
    expect(el.textContent).toContain('Category name must be 2–60 characters');
  });

  it('US-27 S2: a duplicate name shows the error', async () => {
    service.create.mockReturnValue(apiError(409, 'CATEGORY_EXISTS', 'Category name already exists'));
    type(el.querySelector<HTMLInputElement>('form.add input')!, 'design');
    el.querySelector('form.add')!.dispatchEvent(new Event('submit'));
    await fixture.whenStable();
    expect(el.querySelector('[role="alert"]')!.textContent).toContain('Category name already exists');
  });

  it('US-27 S3: renames inline', async () => {
    service.rename.mockReturnValue(of({ ...art, name: 'Fine Art' }));
    button(el.querySelector('[data-test="category-c2"]')!, 'Rename').click();
    await fixture.whenStable();
    const input = el.querySelector<HTMLInputElement>('form.rename input')!;
    expect(input.value).toBe('Art');
    type(input, 'Fine Art');
    el.querySelector('form.rename')!.dispatchEvent(new Event('submit'));
    await fixture.whenStable();
    expect(service.rename).toHaveBeenCalledWith('c2', 'Fine Art');
    expect(el.querySelector('form.rename')).toBeNull();
  });

  it('US-27 S4: deletes after confirming', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    service.remove.mockReturnValue(of(undefined));
    button(el.querySelector('[data-test="category-c2"]')!, 'Delete').click();
    await fixture.whenStable();
    expect(window.confirm).toHaveBeenCalledWith('Delete the category "Art"?');
    expect(service.remove).toHaveBeenCalledWith('c2');
    expect(snack.open).toHaveBeenCalledWith('Category deleted', undefined, expect.anything());
  });

  it('US-27: nothing is deleted when the confirm is cancelled', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(false);
    button(el.querySelector('[data-test="category-c2"]')!, 'Delete').click();
    expect(service.remove).not.toHaveBeenCalled();
  });

  it('US-27 S5: a category in use shows how many courses use it', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    service.remove.mockReturnValue(
      apiError(409, 'CATEGORY_IN_USE', 'This category is used by 3 courses and cannot be deleted'),
    );
    button(el.querySelector('[data-test="category-c1"]')!, 'Delete').click();
    await fixture.whenStable();
    expect(el.querySelector('[role="alert"]')!.textContent).toContain('used by 3 courses');
  });
});
