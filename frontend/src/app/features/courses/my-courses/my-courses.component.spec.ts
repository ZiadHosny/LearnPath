import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { CoursesService, MyCourse } from '../courses.service';
import { MyCoursesComponent } from './my-courses.component';

const draft: MyCourse = {
  id: 'k1',
  title: 'Angular from zero',
  status: 'DRAFT',
  thumbnailUrl: null,
  lessonCount: 0,
  studentCount: 0,
  updatedAt: '2026-10-08T12:00:00.000Z',
};
const live: MyCourse = { ...draft, id: 'k2', title: 'Signals deep dive', status: 'PUBLISHED', lessonCount: 12, studentCount: 1234 };

describe('MyCoursesComponent', () => {
  let fixture: ComponentFixture<MyCoursesComponent>;
  let el: HTMLElement;

  async function setup(items: MyCourse[]) {
    await TestBed.configureTestingModule({
      imports: [MyCoursesComponent],
      providers: [provideRouter([]), { provide: CoursesService, useValue: { mine: vi.fn().mockReturnValue(of(items)) } }],
    }).compileComponents();
    fixture = TestBed.createComponent(MyCoursesComponent);
    el = fixture.nativeElement;
    await fixture.whenStable();
  }

  it('US-13 S1: each course shows title, status, lessons, students and last updated', async () => {
    await setup([live, draft]);
    const row = el.querySelector('[data-test="course-k2"]')!;
    expect(row.textContent).toContain('Signals deep dive');
    expect(row.textContent).toContain('Published');
    expect(row.textContent).toContain('12');
    expect(row.textContent).toContain('1,234');
    expect(row.textContent).toContain('Oct 8, 2026');
    expect(el.querySelector('[data-test="course-k1"]')!.textContent).toContain('Draft');
  });

  it('US-13 S1: keeps the order from the server (newest change first) and links to edit', async () => {
    await setup([live, draft]);
    const rows = [...el.querySelectorAll('tbody tr')].map((row) => row.getAttribute('data-test'));
    expect(rows).toEqual(['course-k2', 'course-k1']);
    const edit = el.querySelector<HTMLAnchorElement>('[data-test="course-k1"] a')!;
    expect(edit.getAttribute('href')).toBe('/my-courses/k1/edit');
    expect(el.querySelector('a[href="/my-courses/new"]')).not.toBeNull();
  });

  it('US-13 S3: with no courses an empty state invites to create one', async () => {
    await setup([]);
    const empty = el.querySelector('[data-test="empty"]')!;
    expect(empty.textContent).toContain('You have no courses yet.');
    expect(empty.querySelector('a')!.getAttribute('href')).toBe('/my-courses/new');
    expect(el.querySelector('table')).toBeNull();
  });
});
