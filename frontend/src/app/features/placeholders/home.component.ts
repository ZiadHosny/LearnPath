import { Component } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '../../core/i18n/translate.pipe';

@Component({
  selector: 'app-home',
  imports: [MatButtonModule, RouterLink, TranslatePipe],
  template: `
    <section class="page home">
      <h1>{{ 'app.name' | t }}</h1>
      <p class="tagline">{{ 'app.tagline' | t }}</p>
      <a mat-flat-button routerLink="/catalog">{{ 'app.browseCourses' | t }}</a>
    </section>
  `,
  styles: `
    .home { text-align: center; padding-top: 48px; }
    .tagline { font: var(--mat-sys-title-medium); margin-bottom: 24px; }
  `,
})
export class HomeComponent {}
