import { Component, OnInit, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { messageFor } from '../../../core/api/api-error';
import { I18nService } from '../../../core/i18n/i18n.service';
import { TranslatePipe } from '../../../core/i18n/translate.pipe';
import { CoursesService, MyCourse } from '../courses.service';

// US-13: the instructor's own courses, most recently updated first.
@Component({
  selector: 'app-my-courses',
  imports: [TranslatePipe, RouterLink, MatButtonModule, MatProgressSpinnerModule],
  templateUrl: './my-courses.component.html',
  styleUrl: './my-courses.component.scss',
})
export class MyCoursesComponent implements OnInit {
  protected readonly i18n = inject(I18nService);
  private readonly courses = inject(CoursesService);

  protected readonly items = signal<MyCourse[]>([]);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);

  ngOnInit(): void {
    this.load();
  }

  protected load(): void {
    this.loading.set(true);
    this.error.set(null);
    this.courses
      .mine()
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (items) => this.items.set(items),
        error: (error) => this.error.set(messageFor(error, this.i18n)),
      });
  }
}
