import { createParamDecorator, type ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';

export interface AuthContext {
  userId: string;
  role: NonNullable<Request['auth']>['role'];
  sessionId: string;
}

// The signed-in caller, as set by JwtAuthGuard.
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthContext =>
    ctx.switchToHttp().getRequest<Request>().auth as AuthContext,
);
