import { Component } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-home',
  imports: [MatButtonModule, RouterLink],
  template: `
    <section class="page home">
      <h1>LearnPath</h1>
      <p class="tagline">Your way to learn.</p>
      <a mat-flat-button routerLink="/catalog">Browse courses</a>
    </section>
  `,
  styles: `
    .home { text-align: center; padding-top: 48px; }
    .tagline { font: var(--mat-sys-title-medium); margin-bottom: 24px; }
  `,
})
export class HomeComponent {}
