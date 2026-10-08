import { HttpErrorResponse } from '@angular/common/http';
import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatSnackBar } from '@angular/material/snack-bar';
import { of, throwError } from 'rxjs';
import { User } from '../../../core/auth/auth.models';
import { AuthService } from '../../../core/auth/auth.service';
import { AdminUser, AdminUserPage, AdminUsersService } from './admin-users.service';
import { AdminUsersComponent } from './admin-users.component';

const admin: User = { id: 'a1', fullName: 'Admin One', email: 'admin@example.com', role: 'ADMIN', photoUrl: null, bio: null };
const sara: AdminUser = { id: 'u2', fullName: 'Sara Ali', email: 'sara@example.com', role: 'STUDENT' };

function page(items: AdminUser[], total = items.length, pageNumber = 1): AdminUserPage {
  return { items, total, page: pageNumber, pageSize: 20 };
}

describe('AdminUsersComponent', () => {
  let fixture: ComponentFixture<AdminUsersComponent>;
  let el: HTMLElement;
  let service: { list: ReturnType<typeof vi.fn>; changeRole: ReturnType<typeof vi.fn> };
  let snack: { open: ReturnType<typeof vi.fn> };

  async function setup(first: AdminUserPage) {
    service = { list: vi.fn().mockReturnValue(of(first)), changeRole: vi.fn() };
    snack = { open: vi.fn() };
    await TestBed.configureTestingModule({
      imports: [AdminUsersComponent],
      providers: [
        { provide: AdminUsersService, useValue: service },
        { provide: AuthService, useValue: { user: signal(admin) } },
        { provide: MatSnackBar, useValue: snack },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(AdminUsersComponent);
    el = fixture.nativeElement;
    await fixture.whenStable();
  }

  function component() {
    return fixture.componentInstance as unknown as {
      changeRole(user: AdminUser, role: string): void;
    };
  }

  it('US-26 S1: lists users with their role and pages of 20', async () => {
    await setup(page([{ ...admin }, sara], 45));
    expect(service.list).toHaveBeenCalledWith('', 1);
    expect(el.querySelector('[data-test="user-u2"]')!.textContent).toContain('sara@example.com');
    expect(el.querySelector('[data-test="user-u2"]')!.textContent).toContain('Student');
    expect(el.querySelector('[data-test="page"]')!.textContent).toContain('Page 1 of 3');

    service.list.mockReturnValue(of(page([sara], 45, 2)));
    const next = [...el.querySelectorAll('button')].find((b) => b.textContent?.includes('Next'))!;
    next.click();
    await fixture.whenStable();
    expect(service.list).toHaveBeenLastCalledWith('', 2);
  });

  it('US-26 S1: searches by name or email from page 1', async () => {
    await setup(page([sara]));
    const input = el.querySelector<HTMLInputElement>('input[name="search"]')!;
    input.value = '  sara ';
    input.dispatchEvent(new Event('input'));
    el.querySelector('form')!.dispatchEvent(new Event('submit'));
    await fixture.whenStable();
    expect(service.list).toHaveBeenLastCalledWith('sara', 1);
  });

  it('US-26: shows an empty message when nobody matches', async () => {
    await setup(page([]));
    expect(el.textContent).toContain('No users match your search.');
  });

  it('US-26 S1: changing a role saves it and says when it applies', async () => {
    await setup(page([sara]));
    service.changeRole.mockReturnValue(of({ ...sara, role: 'INSTRUCTOR' }));
    component().changeRole(sara, 'INSTRUCTOR');
    await fixture.whenStable();
    expect(service.changeRole).toHaveBeenCalledWith('u2', 'INSTRUCTOR');
    expect(snack.open).toHaveBeenCalledWith(expect.stringContaining('Role updated'), undefined, expect.anything());
    expect(el.querySelector('[data-test="user-u2"]')!.textContent).toContain('Instructor');
  });

  it('US-26 S3: my own row is marked and its role cannot be changed', async () => {
    await setup(page([{ ...admin }, sara]));
    const own = el.querySelector('[data-test="user-a1"]')!;
    expect(own.textContent).toContain('(you)');
    expect(own.querySelector('mat-select')!.getAttribute('aria-disabled')).toBe('true');
    expect(el.querySelector('[data-test="user-u2"] mat-select')!.getAttribute('aria-disabled')).toBe('false');
  });

  it('US-26: a refused change shows the error and keeps the saved role', async () => {
    await setup(page([sara]));
    service.changeRole.mockReturnValue(
      throwError(
        () =>
          new HttpErrorResponse({
            status: 400,
            error: { error: { code: 'CANNOT_CHANGE_OWN_ROLE', message: 'You cannot change your own role' } },
          }),
      ),
    );
    component().changeRole(sara, 'ADMIN');
    await fixture.whenStable();
    expect(el.querySelector('[role="alert"]')!.textContent).toContain('You cannot change your own role');
    expect(el.querySelector('[data-test="user-u2"]')!.textContent).toContain('Student');
  });
});
