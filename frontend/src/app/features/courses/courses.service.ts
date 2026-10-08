import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

export type CourseLevel = 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';
export type CourseStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';

export const COURSE_LEVELS: CourseLevel[] = ['BEGINNER', 'INTERMEDIATE', 'ADVANCED'];

// Same limits as the server (backend/src/modules/courses/dto/course.dto.ts).
export const COURSE_LIMITS = {
  title: 120,
  shortDescription: 250,
  description: 5000,
  outcomes: 10,
  outcome: 120,
} as const;

export interface Course {
  id: string;
  title: string;
  shortDescription: string;
  description: string | null;
  learningOutcomes: string[];
  level: CourseLevel;
  category: { id: string; name: string };
  thumbnailUrl: string | null;
  status: CourseStatus;
  ownerId: string;
  createdAt: string;
  updatedAt: string;
}

export interface MyCourse {
  id: string;
  title: string;
  status: CourseStatus;
  thumbnailUrl: string | null;
  lessonCount: number;
  studentCount: number;
  updatedAt: string;
}

export interface CourseInput {
  title: string;
  shortDescription: string;
  description: string | null;
  categoryId: string;
  level: CourseLevel;
  learningOutcomes: string[];
}

@Injectable({ providedIn: 'root' })
export class CoursesService {
  private readonly http = inject(HttpClient);

  mine(): Observable<MyCourse[]> {
    return this.http.get<MyCourse[]>('/api/courses/mine');
  }

  get(id: string): Observable<Course> {
    return this.http.get<Course>(`/api/courses/${id}`);
  }

  create(input: CourseInput): Observable<Course> {
    return this.http.post<Course>('/api/courses', input);
  }

  update(id: string, input: CourseInput): Observable<Course> {
    return this.http.patch<Course>(`/api/courses/${id}`, input);
  }

  uploadThumbnail(id: string, file: File): Observable<Course> {
    const body = new FormData();
    body.append('thumbnail', file);
    return this.http.put<Course>(`/api/courses/${id}/thumbnail`, body);
  }
}
