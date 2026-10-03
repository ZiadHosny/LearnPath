import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { Role } from './auth.models';
import { AuthService } from './auth.service';
import { roleHome } from './role-home';

// Signed-in users only; guests go to login and come back afterwards.
export const authGuard: CanActivateFn = (_route, state) => {
  const auth = inject(AuthService);
  if (auth.isLoggedIn()) return true;
  return inject(Router).createUrlTree(['/login'], { queryParams: { returnUrl: state.url } });
};

// Only the given roles; guests go to login, other roles to their own home page.
export function roleGuard(...roles: Role[]): CanActivateFn {
  return (_route, state) => {
    const role = inject(AuthService).role();
    const router = inject(Router);
    if (!role) return router.createUrlTree(['/login'], { queryParams: { returnUrl: state.url } });
    return roles.includes(role) ? true : router.parseUrl(roleHome(role));
  };
}

// Guests only (login, sign up, forgot password); signed-in users go to their home page.
export const guestGuard: CanActivateFn = () => {
  const role = inject(AuthService).role();
  return role ? inject(Router).parseUrl(roleHome(role)) : true;
};
