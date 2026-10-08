import { Component, computed, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatToolbarModule } from '@angular/material/toolbar';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { Role } from '../../core/auth/auth.models';
import { AuthService } from '../../core/auth/auth.service';
import { roleHome } from '../../core/auth/role-home';
import { TranslatePipe } from '../../core/i18n/translate.pipe';
import { LanguageSwitchComponent } from './language-switch.component';

// Translation keys (core/i18n/locales/*.ts → nav.*).
const HOME_LABEL: Record<Role, string> = {
  STUDENT: 'nav.myLearning',
  INSTRUCTOR: 'nav.myCourses',
  ADMIN: 'nav.dashboard',
};

interface MenuLink {
  label: string; // translation key
  path: string;
}

@Component({
  selector: 'app-header',
  imports: [
    MatToolbarModule,
    MatButtonModule,
    MatIconModule,
    MatMenuModule,
    RouterLink,
    RouterLinkActive,
    TranslatePipe,
    LanguageSwitchComponent,
  ],
  templateUrl: './header.component.html',
  styleUrl: './header.component.scss',
})
export class HeaderComponent {
  protected readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  // Menu table in contracts/ui-routes.md (FR-016).
  protected readonly links = computed<MenuLink[]>(() => {
    const role = this.auth.role();
    if (!role) return [{ label: 'nav.catalog', path: '/catalog' }];
    const adminLinks: MenuLink[] =
      role === 'ADMIN'
        ? [
            { label: 'nav.users', path: '/admin/users' },
            { label: 'nav.categories', path: '/admin/categories' },
          ]
        : [];
    return [
      { label: 'nav.catalog', path: '/catalog' },
      { label: HOME_LABEL[role], path: roleHome(role) },
      ...adminLinks,
      { label: 'nav.profile', path: '/profile' },
      { label: 'nav.changePassword', path: '/profile/password' },
    ];
  });

  protected logout(): void {
    this.auth.logout().subscribe(() => void this.router.navigateByUrl('/'));
  }
}
