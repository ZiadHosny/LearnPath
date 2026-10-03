import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable, catchError, finalize, map, of, shareReplay, tap } from 'rxjs';
import { AuthResponse, User } from './auth.models';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private refreshInFlight: Observable<string> | null = null;

  // The access token lives only in memory; the long-lived refresh credential is an HttpOnly cookie.
  readonly user = signal<User | null>(null);
  readonly accessToken = signal<string | null>(null);
  readonly isLoggedIn = computed(() => this.user() !== null);
  readonly role = computed(() => this.user()?.role ?? null);

  register(
    fullName: string,
    email: string,
    password: string,
    confirmPassword: string,
  ): Observable<void> {
    return this.http
      .post<AuthResponse>('/api/auth/register', { fullName, email, password, confirmPassword })
      .pipe(map((response) => this.setSession(response)));
  }

  login(email: string, password: string): Observable<User> {
    return this.http.post<AuthResponse>('/api/auth/login', { email, password }).pipe(
      tap((response) => this.setSession(response)),
      map((response) => response.user),
    );
  }

  // Renews the access token from the refresh cookie. Concurrent callers share one request.
  refresh(): Observable<string> {
    this.refreshInFlight ??= this.http.post<AuthResponse>('/api/auth/refresh', {}).pipe(
      tap((response) => this.setSession(response)),
      map((response) => response.accessToken),
      finalize(() => (this.refreshInFlight = null)),
      shareReplay({ bufferSize: 1, refCount: false }),
    );
    return this.refreshInFlight;
  }

  // Called once at start-up to restore a login that survives page reloads.
  restore(): Observable<void> {
    return this.refresh().pipe(
      map(() => undefined),
      catchError(() => {
        this.clear();
        return of(undefined);
      }),
    );
  }

  // Always ends the local login, even if the server call fails.
  logout(): Observable<void> {
    return this.http.post<void>('/api/auth/logout', {}).pipe(
      catchError(() => of(undefined)),
      map(() => undefined),
      finalize(() => this.clear()),
    );
  }

  setSession(response: AuthResponse): void {
    this.accessToken.set(response.accessToken);
    this.user.set(response.user);
  }

  clear(): void {
    this.accessToken.set(null);
    this.user.set(null);
  }
}
