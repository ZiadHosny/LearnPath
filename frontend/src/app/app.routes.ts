import { Routes } from '@angular/router';
import { authGuard, guestGuard, roleGuard } from './core/auth/auth.guards';
import { HomeComponent } from './features/placeholders/home.component';
import { PlaceholderComponent } from './features/placeholders/placeholder.component';

export const routes: Routes = [
  { path: '', component: HomeComponent },
  {
    path: 'register',
    canActivate: [guestGuard],
    loadComponent: () =>
      import('./features/auth/register/register.component').then((m) => m.RegisterComponent),
    title: 'titles.register',
  },
  {
    path: 'login',
    canActivate: [guestGuard],
    loadComponent: () =>
      import('./features/auth/login/login.component').then((m) => m.LoginComponent),
    title: 'titles.login',
  },
  {
    path: 'forgot-password',
    canActivate: [guestGuard],
    loadComponent: () =>
      import('./features/auth/forgot-password/forgot-password.component').then(
        (m) => m.ForgotPasswordComponent,
      ),
    title: 'titles.forgotPassword',
  },
  {
    path: 'reset-password/:token',
    loadComponent: () =>
      import('./features/auth/reset-password/reset-password.component').then(
        (m) => m.ResetPasswordComponent,
      ),
    title: 'titles.resetPassword',
  },
  {
    path: 'profile',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/profile/profile/profile.component').then((m) => m.ProfileComponent),
    title: 'titles.profile',
  },
  {
    path: 'profile/password',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/profile/change-password/change-password.component').then(
        (m) => m.ChangePasswordComponent,
      ),
    title: 'titles.changePassword',
  },
  {
    path: 'catalog',
    component: PlaceholderComponent,
    data: { title: 'placeholder.catalog', epic: 'placeholder.ep02' },
    title: 'titles.catalog',
  },
  {
    path: 'my-learning',
    canActivate: [roleGuard('STUDENT')],
    component: PlaceholderComponent,
    data: { title: 'titles.myLearning', epic: 'placeholder.ep04' },
    title: 'titles.myLearning',
  },
  {
    path: 'my-courses',
    canActivate: [roleGuard('INSTRUCTOR')],
    component: PlaceholderComponent,
    data: { title: 'titles.myCourses', epic: 'placeholder.ep03' },
    title: 'titles.myCourses',
  },
  {
    path: 'admin/dashboard',
    canActivate: [roleGuard('ADMIN')],
    component: PlaceholderComponent,
    data: { title: 'titles.dashboard', epic: 'placeholder.ep05' },
    title: 'titles.dashboard',
  },
  { path: '**', redirectTo: '' },
];
