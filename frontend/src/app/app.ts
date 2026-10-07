import { Dir } from '@angular/cdk/bidi';
import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { I18nService } from './core/i18n/i18n.service';
import { HeaderComponent } from './layout/header/header.component';

// [dir] gives Angular Material (menus, form fields, overlays) the current direction (RTL/LTR).
@Component({
  selector: 'app-root',
  imports: [RouterOutlet, HeaderComponent, Dir],
  template: `
    <div class="app-shell" [dir]="i18n.dir()">
      <app-header />
      <main>
        <router-outlet />
      </main>
    </div>
  `,
})
export class App {
  protected readonly i18n = inject(I18nService);
}
