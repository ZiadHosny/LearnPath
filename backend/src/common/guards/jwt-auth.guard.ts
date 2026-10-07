import { Injectable, type CanActivate, type ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { verifyAccessToken } from '../../lib/tokens.js';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator.js';
import { Errors } from '../http/app-error.js';

// Global guard: every endpoint needs a valid access token unless marked @Public().
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest<Request>();
    const match = /^Bearer\s+(\S+)$/i.exec(request.get('authorization') ?? '');
    if (!match) throw Errors.unauthenticated();

    try {
      const claims = verifyAccessToken(match[1]);
      request.auth = { userId: claims.sub, role: claims.role, sessionId: claims.sid };
    } catch {
      throw Errors.unauthenticated();
    }
    return true;
  }
}
