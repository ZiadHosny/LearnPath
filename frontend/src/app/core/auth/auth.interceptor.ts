import { HttpErrorResponse, HttpInterceptorFn, HttpRequest } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, switchMap, throwError } from 'rxjs';
import { errorCode } from '../api/api-error';
import { AuthService } from './auth.service';

function withToken(req: HttpRequest<unknown>, token: string) {
  return req.clone({ setHeaders: { Authorization: `Bearer ${token}` } });
}

// Adds the bearer token to /api calls. On 401, renews once (shared across concurrent requests)
// and retries; if renewal fails the user is signed out and sent to the login page.
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  if (!req.url.startsWith('/api/')) return next(req);

  const auth = inject(AuthService);
  const router = inject(Router);
  const isAuthCall = req.url.startsWith('/api/auth/');
  const token = auth.accessToken();

  if (isAuthCall || !token) return next(req);

  return next(withToken(req, token)).pipe(
    catchError((error: unknown) => {
      if (!(error instanceof HttpErrorResponse) || error.status !== 401) {
        return throwError(() => error);
      }
      return auth.refresh().pipe(
        catchError((refreshError: unknown) => {
          auth.clear();
          const blocked = errorCode(refreshError) === 'ACCOUNT_BLOCKED';
          void router.navigate(['/login'], { queryParams: blocked ? { reason: 'blocked' } : {} });
          return throwError(() => error);
        }),
        switchMap((newToken) => next(withToken(req, newToken))),
      );
    }),
  );
};
