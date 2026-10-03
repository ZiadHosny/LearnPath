import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class PasswordResetService {
  private readonly http = inject(HttpClient);

  request(email: string): Observable<{ message: string }> {
    return this.http.post<{ message: string }>('/api/auth/password-reset/request', { email });
  }

  check(token: string): Observable<{ valid: true }> {
    return this.http.get<{ valid: true }>(`/api/auth/password-reset/${encodeURIComponent(token)}`);
  }

  confirm(token: string, newPassword: string, confirmPassword: string): Observable<void> {
    return this.http.post<void>('/api/auth/password-reset/confirm', {
      token,
      newPassword,
      confirmPassword,
    });
  }
}
