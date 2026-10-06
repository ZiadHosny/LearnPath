import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { LockoutService } from './lockout.service.js';
import { SessionService } from './session.service.js';

@Module({
  controllers: [AuthController],
  providers: [AuthService, LockoutService, SessionService],
  exports: [SessionService],
})
export class AuthModule {}
