import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { User } from '../../core/auth/auth.models';

@Injectable({ providedIn: 'root' })
export class ProfileService {
  private readonly http = inject(HttpClient);

  getMe(): Observable<User> {
    return this.http.get<User>('/api/users/me');
  }

  update(changes: { fullName?: string; bio?: string | null }): Observable<User> {
    return this.http.patch<User>('/api/users/me', changes);
  }

  uploadPhoto(file: File): Observable<User> {
    const body = new FormData();
    body.append('photo', file);
    return this.http.put<User>('/api/users/me/photo', body);
  }

  changePassword(currentPassword: string, newPassword: string, confirmPassword: string) {
    return this.http.post<void>('/api/users/me/password', {
      currentPassword,
      newPassword,
      confirmPassword,
    });
  }
}
