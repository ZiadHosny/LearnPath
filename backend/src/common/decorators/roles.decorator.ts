import { SetMetadata } from '@nestjs/common';
import type { Role } from '../../generated/prisma/enums.js';

export const ROLES_KEY = 'roles';

// Only these roles may call the endpoint; others get 403 FORBIDDEN.
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);
