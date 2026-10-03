import { Component, input } from '@angular/core';

// Stand-in for pages built by later epics; title and epic come from route data.
@Component({
  selector: 'app-placeholder',
  template: `
    <section class="page">
      <h1>{{ title() }}</h1>
      <p>This page is coming in {{ epic() }}.</p>
    </section>
  `,
})
export class PlaceholderComponent {
  readonly title = input.required<string>();
  readonly epic = input.required<string>();
}
