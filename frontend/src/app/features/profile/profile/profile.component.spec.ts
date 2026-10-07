import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatSnackBar } from '@angular/material/snack-bar';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { User } from '../../../core/auth/auth.models';
import { AuthService } from '../../../core/auth/auth.service';
import { ProfileService } from '../profile.service';
import { ProfileComponent } from './profile.component';

const me: User = {
  id: 'u1',
  fullName: 'Ali Hassan',
  email: 'ali@example.com',
  role: 'STUDENT',
  photoUrl: '/uploads/avatars/u1-old.png',
  bio: 'Hello',
};

describe('ProfileComponent', () => {
  let fixture: ComponentFixture<ProfileComponent>;
  let el: HTMLElement;
  let profile: { getMe: ReturnType<typeof vi.fn>; update: ReturnType<typeof vi.fn>; uploadPhoto: ReturnType<typeof vi.fn> };
  let snack: { open: ReturnType<typeof vi.fn> };
  const user = signal<User | null>(me);

  beforeEach(async () => {
    user.set(me);
    profile = {
      getMe: vi.fn().mockReturnValue(of(me)),
      update: vi.fn(),
      uploadPhoto: vi.fn(),
    };
    snack = { open: vi.fn() };
    await TestBed.configureTestingModule({
      imports: [ProfileComponent],
      providers: [
        provideRouter([]),
        { provide: ProfileService, useValue: profile },
        { provide: AuthService, useValue: { user } },
        { provide: MatSnackBar, useValue: snack },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(ProfileComponent);
    el = fixture.nativeElement;
    await fixture.whenStable();
  });

  function selectFile(file: File) {
    const input = el.querySelector<HTMLInputElement>('input[type="file"]')!;
    Object.defineProperty(input, 'files', { value: [file], configurable: true });
    input.dispatchEvent(new Event('change'));
  }

  it('US-05 S1: shows the email as read-only', () => {
    const email = el.querySelector<HTMLInputElement>('input[data-test="email"]')!;
    expect(email.value).toBe('ali@example.com');
    expect(email.readOnly).toBe(true);
    expect(el.querySelector<HTMLInputElement>('input[formControlName="fullName"]')!.value).toBe('Ali Hassan');
  });

  it('US-05 S2: saving shows "Profile updated" and updates the signed-in user', async () => {
    const updated = { ...me, fullName: 'Mona Ali' };
    profile.update.mockReturnValue(of(updated));

    const name = el.querySelector<HTMLInputElement>('input[formControlName="fullName"]')!;
    name.value = 'Mona Ali';
    name.dispatchEvent(new Event('input'));
    el.querySelector('form')!.dispatchEvent(new Event('submit'));
    await fixture.whenStable();

    expect(profile.update).toHaveBeenCalledWith({ fullName: 'Mona Ali', bio: 'Hello' });
    expect(snack.open).toHaveBeenCalledWith('Profile updated', undefined, expect.anything());
    expect(user()?.fullName).toBe('Mona Ali');
  });

  it('US-05 S4: a file over 2 MB is refused before upload and the current photo is kept', async () => {
    selectFile(new File([new Uint8Array(3 * 1024 * 1024)], 'big.jpg', { type: 'image/jpeg' }));
    await fixture.whenStable();
    expect(profile.uploadPhoto).not.toHaveBeenCalled();
    expect(el.textContent).toContain('Photo must be a JPG or PNG image of 2 MB or less');
    expect(el.querySelector<HTMLImageElement>('img.avatar')!.getAttribute('src')).toBe(me.photoUrl);
  });

  it('US-05 S4: a GIF is refused before upload', async () => {
    selectFile(new File([new Uint8Array(10)], 'anim.gif', { type: 'image/gif' }));
    await fixture.whenStable();
    expect(profile.uploadPhoto).not.toHaveBeenCalled();
    expect(el.textContent).toContain('Photo must be a JPG or PNG image of 2 MB or less');
  });

  it('US-05 S3: a valid photo is uploaded and shown', async () => {
    profile.uploadPhoto.mockReturnValue(of({ ...me, photoUrl: '/uploads/avatars/u1-new.png' }));
    selectFile(new File([new Uint8Array(10)], 'me.png', { type: 'image/png' }));
    await fixture.whenStable();
    expect(profile.uploadPhoto).toHaveBeenCalled();
    expect(el.querySelector<HTMLImageElement>('img.avatar')!.getAttribute('src')).toBe('/uploads/avatars/u1-new.png');
  });
});
