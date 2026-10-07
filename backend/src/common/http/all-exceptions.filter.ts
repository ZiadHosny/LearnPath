import {
  Catch,
  NotFoundException,
  PayloadTooLargeException,
  type ArgumentsHost,
  type ExceptionFilter,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { AppLogger } from '../logging/app-logger.service.js';
import { AppError, Errors, TooManyAttemptsError } from './app-error.js';
import { toErrorBody } from './response-format.js';

// Global: every error leaves through here, shaped by response-format.ts (toErrorBody).
// Unexpected errors are logged once with the request id and stack, never with the request body.
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  constructor(private readonly logger: AppLogger) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const http = host.switchToHttp();
    const res = http.getResponse<Response>();
    const req = http.getRequest<Request>();
    const error = this.toAppError(exception, req);

    if (error instanceof TooManyAttemptsError) {
      res.set('Retry-After', String(error.retryAfterSeconds));
    }
    res.status(error.status).json(toErrorBody(error, req.language));
  }

  private toAppError(exception: unknown, req: Request): AppError {
    // Body-parser failures are converted to AppError in app.setup.ts before they get here.
    if (exception instanceof AppError) return exception;
    if (exception instanceof NotFoundException) return Errors.notFound();
    if (exception instanceof PayloadTooLargeException) return Errors.fileTooLarge();

    // Method and path only: never the body, headers or query (they can hold secrets).
    const meta = { context: 'Exceptions', requestId: req.requestId };
    const message = `Unhandled error on ${req.method} ${req.path}`;
    if (exception instanceof Error) this.logger.error(message, meta, exception);
    else this.logger.error(message, { ...meta, detail: String(exception) });
    return Errors.internal();
  }
}
