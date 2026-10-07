import { Pipe, inject, type PipeTransform } from '@angular/core';
import { I18nService } from './i18n.service';

// {{ 'auth.login.title' | t }} or {{ 'placeholder.comingIn' | t: { epic: name } }}
// Not pure, so texts change as soon as the language changes.
@Pipe({ name: 't', pure: false })
export class TranslatePipe implements PipeTransform {
  private readonly i18n = inject(I18nService);

  transform(key: string, params?: Record<string, string | number>): string {
    return this.i18n.t(key, params);
  }
}
