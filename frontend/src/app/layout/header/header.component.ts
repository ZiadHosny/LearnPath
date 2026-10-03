import { Component, computed, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatToolbarModule } from '@angular/material/toolbar';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { Role } from '../../core/auth/auth.models';
import { AuthService } from '../../core/auth/auth.service';
import { roleHome } from '../../core/auth/role-home';

const HOME_LABEL: Record<Role, string> = {
  STUDENT: 'My Learning',
  INSTRUCTOR: 'My Courses',
  ADMIN: 'Dashboard',
};

interface MenuLink {
  label: string;
  path: string;
}

@Component({
  selector: 'app-header',
  imports: [MatToolbarModule, MatButtonModule, MatIconModule, MatMenuModule, RouterLink, RouterLinkActive],
  templateUrl: './header.component.html',
  styleUrl: './header.component.scss',
})
export class HeaderComponent {
  protected readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  // Menu table in contracts/ui-routes.md (FR-016).
  protected readonly links = computed<MenuLink[]>(() => {
    const role = this.auth.role();
    if (!role) return [{ label: 'Catalog', path: '/catalog' }];
    return [
      { label: 'Catalog', path: '/catalog' },
      { label: HOME_LABEL[role], path: roleHome(role) },
      { label: 'Profile', path: '/profile' },
      { label: 'Change password', path: '/profile/password' },
    ];
  });

  protected logout(): void {
    this.auth.logout().subscribe(() => void this.router.navigateByUrl('/'));
  }
}
