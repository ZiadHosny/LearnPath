import { Global, Module } from '@nestjs/common';
import { env } from '../../config/env.validation.js';
import { AppLogger } from './app-logger.service.js';
import { loggerOptionsFromEnv } from './logger.config.js';

// One AppLogger for the whole app, configured from LOG_LEVEL / LOG_COLORS / LOG_FORMAT.
@Global()
@Module({
  providers: [{ provide: AppLogger, useFactory: () => new AppLogger(loggerOptionsFromEnv(env)) }],
  exports: [AppLogger],
})
export class LoggingModule {}
