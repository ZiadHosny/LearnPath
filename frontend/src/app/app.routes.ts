import { Routes } from '@angular/router';
import { authGuard, guestGuard, roleGuard } from './core/auth/auth.guards';
import { HomeComponent } from './features/placeholders/home.component';
import { PlaceholderComponent } from './features/placeholders/placeholder.component';

export const routes: Routes = [
  { path: '', component: HomeComponent, title: 'LearnPath' },
  {
    path: 'register',
    canActivate: [guestGuard],
    loadComponent: () =>
      import('./features/auth/register/register.component').then((m) => m.RegisterComponent),
    title: 'Sign up · LearnPath',
  },
  {
    path: 'login',
    canActivate: [guestGuard],
    loadComponent: () =>
      import('./features/auth/login/login.component').then((m) => m.LoginComponent),
    title: 'Log in · LearnPath',
  },
  {
    path: 'forgot-password',
    canActivate: [guestGuard],
    loadComponent: () =>
      import('./features/auth/forgot-password/forgot-password.component').then(
        (m) => m.ForgotPasswordComponent,
      ),
    title: 'Forgot password · LearnPath',
  },
  {
    path: 'reset-password/:token',
    loadComponent: () =>
      import('./features/auth/reset-password/reset-password.component').then(
        (m) => m.ResetPasswordComponent,
      ),
    title: 'Reset password · LearnPath',
  },
  {
    path: 'profile',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/profile/profile/profile.component').then((m) => m.ProfileComponent),
    title: 'My profile · LearnPath',
  },
  {
    path: 'profile/password',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/profile/change-password/change-password.component').then(
        (m) => m.ChangePasswordComponent,
      ),
    title: 'Change password · LearnPath',
  },
  {
    path: 'catalog',
    component: PlaceholderComponent,
    data: { title: 'Course catalog', epic: 'EP-02 Course catalog' },
    title: 'Catalog · LearnPath',
  },
  {
    path: 'my-learning',
    canActivate: [roleGuard('STUDENT')],
    component: PlaceholderComponent,
    data: { title: 'My Learning', epic: 'EP-04 Enrollment & learning' },
    title: 'My Learning · LearnPath',
  },
  {
    path: 'my-courses',
    canActivate: [roleGuard('INSTRUCTOR')],
    component: PlaceholderComponent,
    data: { title: 'My Courses', epic: 'EP-03 Instructor course management' },
    title: 'My Courses · LearnPath',
  },
  {
    path: 'admin/dashboard',
    canActivate: [roleGuard('ADMIN')],
    component: PlaceholderComponent,
    data: { title: 'Dashboard', epic: 'EP-05 Admin basics' },
    title: 'Dashboard · LearnPath',
  },
  { path: '**', redirectTo: '' },
];
