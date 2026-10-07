import { Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { AuthService } from '../../core/auth/auth.service';
import { I18nService } from '../../core/i18n/i18n.service';
import { TranslatePipe } from '../../core/i18n/translate.pipe';

// Globe button with every language from core/i18n/languages.ts. Signed-in users also get the
// choice saved on their account.
@Component({
  selector: 'app-language-switch',
  imports: [MatButtonModule, MatIconModule, MatMenuModule, TranslatePipe],
  template: `
    <button mat-icon-button type="button" [matMenuTriggerFor]="menu" [attr.aria-label]="'nav.language' | t">
      <mat-icon>language</mat-icon>
    </button>
    <mat-menu #menu="matMenu">
      @for (language of i18n.languages; track language.code) {
        <button
          mat-menu-item
          type="button"
          data-test="language-option"
          [attr.lang]="language.code"
          [class.active]="language.code === i18n.language()"
          (click)="choose(language.code)"
        >
          {{ language.name }}
        </button>
      }
    </mat-menu>
  `,
  styles: `
    .active {
      font-weight: 600;
    }
  `,
})
export class LanguageSwitchComponent {
  protected readonly i18n = inject(I18nService);
  private readonly auth = inject(AuthService);

  async choose(code: string): Promise<void> {
    await this.i18n.use(code);
    if (this.auth.isLoggedIn()) this.auth.saveLanguage(code).subscribe({ error: () => undefined });
  }
}
