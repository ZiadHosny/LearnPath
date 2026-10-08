import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { Role } from '../../../core/auth/auth.models';

export interface AdminUser {
  id: string;
  fullName: string;
  email: string;
  role: Role;
}

export interface AdminUserPage {
  items: AdminUser[];
  total: number;
  page: number;
  pageSize: number;
}

@Injectable({ providedIn: 'root' })
export class AdminUsersService {
  private readonly http = inject(HttpClient);

  list(search: string, page: number): Observable<AdminUserPage> {
    let params = new HttpParams().set('page', page);
    if (search) params = params.set('search', search);
    return this.http.get<AdminUserPage>('/api/admin/users', { params });
  }

  changeRole(id: string, role: Role): Observable<AdminUser> {
    return this.http.patch<AdminUser>(`/api/admin/users/${id}/role`, { role });
  }
}
