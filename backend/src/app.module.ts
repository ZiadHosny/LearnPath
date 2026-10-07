import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR, APP_PIPE } from '@nestjs/core';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard.js';
import { RolesGuard } from './common/guards/roles.guard.js';
import { AllExceptionsFilter } from './common/http/all-exceptions.filter.js';
import { ResponseInterceptor } from './common/http/response.interceptor.js';
import { LoggingModule } from './common/logging/logging.module.js';
import { createValidationPipe } from './common/pipes/validation.pipe.js';
import { validateEnv } from './config/env.validation.js';
import { MailModule } from './mail/mail.module.js';
import { AuthModule } from './modules/auth/auth.module.js';
import { PasswordResetModule } from './modules/password-reset/password-reset.module.js';
import { UsersModule } from './modules/users/users.module.js';
import { PrismaModule } from './prisma/prisma.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate: validateEnv }),
    LoggingModule,
    PrismaModule,
    MailModule,
    AuthModule,
    UsersModule,
    PasswordResetModule,
  ],
  providers: [
    // Guards run in this order: login first, then roles.
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    // Input validation, then the response shape (common/http/response-format.ts) for both
    // successes (interceptor) and errors (filter).
    { provide: APP_PIPE, useFactory: createValidationPipe },
    { provide: APP_INTERCEPTOR, useClass: ResponseInterceptor },
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
  ],
})
export class AppModule {}
