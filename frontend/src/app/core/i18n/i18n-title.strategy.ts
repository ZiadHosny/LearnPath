import { Injectable, effect, inject } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { TitleStrategy, type RouterStateSnapshot } from '@angular/router';
import { I18nService } from './i18n.service';

// Route titles are translation keys (e.g. 'titles.login'); the browser tab shows
// "<translated title> · LearnPath" and follows language changes.
@Injectable()
export class I18nTitleStrategy extends TitleStrategy {
  private readonly title = inject(Title);
  private readonly i18n = inject(I18nService);
  private lastKey: string | undefined;

  constructor() {
    super();
    effect(() => {
      this.i18n.language(); // re-run when the language changes
      this.apply();
    });
  }

  override updateTitle(snapshot: RouterStateSnapshot): void {
    this.lastKey = this.buildTitle(snapshot);
    this.apply();
  }

  private apply(): void {
    const app = this.i18n.t('app.name');
    this.title.setTitle(this.lastKey ? `${this.i18n.t(this.lastKey)} · ${app}` : app);
  }
}
