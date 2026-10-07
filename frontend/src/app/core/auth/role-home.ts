import { Role } from './auth.models';

const ROLE_HOME: Record<Role, string> = {
  STUDENT: '/my-learning',
  INSTRUCTOR: '/my-courses',
  ADMIN: '/admin/dashboard',
};

export function roleHome(role: Role): string {
  return ROLE_HOME[role];
}
