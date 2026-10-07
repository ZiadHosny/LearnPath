import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { AuthService } from '../../core/auth/auth.service';
import { I18nService } from '../../core/i18n/i18n.service';
import { LANGUAGES } from '../../core/i18n/languages';
import { LanguageSwitchComponent } from './language-switch.component';

describe('LanguageSwitchComponent', () => {
  const loggedIn = signal(false);
  let saveLanguage: ReturnType<typeof vi.fn>;

  async function render() {
    localStorage.removeItem('lp_language');
    saveLanguage = vi.fn().mockReturnValue(of(undefined));
    await TestBed.configureTestingModule({
      imports: [LanguageSwitchComponent],
      providers: [{ provide: AuthService, useValue: { isLoggedIn: loggedIn, saveLanguage } }],
    }).compileComponents();
    const fixture = TestBed.createComponent(LanguageSwitchComponent);
    await fixture.whenStable();
    return fixture;
  }

  afterEach(() => localStorage.removeItem('lp_language'));

  it('US-31 S1: offers every language from the list', async () => {
    const fixture = await render();
    // Menu items render in an overlay (outside the component) once the menu is opened.
    (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>('button')!.click();
    await fixture.whenStable();
    const names = Array.from(document.querySelectorAll('[data-test="language-option"]')).map((el) =>
      el.textContent!.trim(),
    );
    expect(names).toEqual(LANGUAGES.map((l) => l.name));
  });

  it('US-30 S2: choosing a language switches the app', async () => {
    loggedIn.set(false);
    const fixture = await render();
    await fixture.componentInstance.choose('ar');
    expect(TestBed.inject(I18nService).language()).toBe('ar');
    expect(saveLanguage).not.toHaveBeenCalled();
  });

  it('US-30 S4: when signed in, the choice is saved on the account', async () => {
    loggedIn.set(true);
    const fixture = await render();
    await fixture.componentInstance.choose('ar');
    expect(saveLanguage).toHaveBeenCalledWith('ar');
  });
});
