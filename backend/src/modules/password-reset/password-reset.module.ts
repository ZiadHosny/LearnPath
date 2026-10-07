import { Module } from '@nestjs/common';
import { PasswordResetController } from './password-reset.controller.js';
import { PasswordResetService } from './password-reset.service.js';

@Module({
  controllers: [PasswordResetController],
  providers: [PasswordResetService],
})
export class PasswordResetModule {}
