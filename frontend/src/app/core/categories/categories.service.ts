import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

export interface Category {
  id: string;
  name: string;
  courseCount: number;
}

// Shared: admins manage categories (US-27); instructors pick one for a course (US-12, US-14).
@Injectable({ providedIn: 'root' })
export class CategoriesService {
  private readonly http = inject(HttpClient);

  list(): Observable<Category[]> {
    return this.http.get<Category[]>('/api/categories');
  }

  create(name: string): Observable<Category> {
    return this.http.post<Category>('/api/categories', { name });
  }

  rename(id: string, name: string): Observable<Category> {
    return this.http.patch<Category>(`/api/categories/${id}`, { name });
  }

  remove(id: string): Observable<void> {
    return this.http.delete<void>(`/api/categories/${id}`);
  }
}
