import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { Role } from '../../core/auth/auth.models';
import { AuthService } from '../../core/auth/auth.service';
import { HeaderComponent } from './header.component';

describe('HeaderComponent', () => {
  const role = signal<Role | null>(null);
  let logout: ReturnType<typeof vi.fn>;

  async function render(r: Role | null) {
    role.set(r);
    logout = vi.fn().mockReturnValue(of(undefined));
    await TestBed.configureTestingModule({
      imports: [HeaderComponent],
      providers: [
        provideRouter([]),
        {
          provide: AuthService,
          useValue: { role, isLoggedIn: () => role() !== null, user: () => null, logout },
        },
      ],
    }).compileComponents();
    const fixture = TestBed.createComponent(HeaderComponent);
    await fixture.whenStable();
    return fixture;
  }

  function mainMenuItems(fixture: { nativeElement: HTMLElement }): string[] {
    return Array.from(fixture.nativeElement.querySelectorAll('nav.links a, nav.links button')).map(
      (item) => (item as HTMLElement).textContent!.trim(),
    );
  }

  // Menu table in contracts/ui-routes.md
  it.each([
    [null, ['Catalog', 'Log in', 'Sign up']],
    ['STUDENT', ['Catalog', 'My Learning', 'Profile', 'Change password', 'Log out']],
    ['INSTRUCTOR', ['Catalog', 'My Courses', 'Profile', 'Change password', 'Log out']],
    ['ADMIN', ['Catalog', 'Dashboard', 'Profile', 'Change password', 'Log out']],
  ] as const)('US-04 S4: the %s menu shows exactly its items', async (r, expected) => {
    const fixture = await render(r);
    expect(mainMenuItems(fixture)).toEqual(expected);
  });

  it('US-03 S1: Log out clears the login and goes to the home page', async () => {
    const fixture = await render('STUDENT');
    const router = TestBed.inject(Router);
    vi.spyOn(router, 'navigateByUrl').mockResolvedValue(true);

    const button = (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>(
      '[data-test="logout"]',
    )!;
    button.click();
    await fixture.whenStable();

    expect(logout).toHaveBeenCalled();
    expect(router.navigateByUrl).toHaveBeenCalledWith('/');
  });
});
