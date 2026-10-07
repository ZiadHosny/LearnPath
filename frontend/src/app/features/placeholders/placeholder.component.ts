import { Component, input } from '@angular/core';
import { TranslatePipe } from '../../core/i18n/translate.pipe';

// Stand-in for pages built by later epics; title and epic are translation keys from route data.
@Component({
  selector: 'app-placeholder',
  imports: [TranslatePipe],
  template: `
    <section class="page">
      <h1>{{ title() | t }}</h1>
      <p>{{ 'placeholder.comingIn' | t: { epic: (epic() | t) } }}</p>
    </section>
  `,
})
export class PlaceholderComponent {
  readonly title = input.required<string>();
  readonly epic = input.required<string>();
}
