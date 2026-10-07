import { Injectable, type CanActivate, type ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import type { Role } from '../../generated/prisma/enums.js';
import { ROLES_KEY } from '../decorators/roles.decorator.js';
import { Errors } from '../http/app-error.js';

// Global guard, runs after JwtAuthGuard: enforces @Roles(...) where it is declared.
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const roles = this.reflector.getAllAndOverride<Role[] | undefined>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!roles || roles.length === 0) return true;

    const { auth } = context.switchToHttp().getRequest<Request>();
    if (!auth) throw Errors.unauthenticated();
    if (!roles.includes(auth.role)) throw Errors.forbidden();
    return true;
  }
}
