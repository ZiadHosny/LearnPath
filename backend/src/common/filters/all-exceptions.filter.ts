import {
  Catch,
  Logger,
  NotFoundException,
  PayloadTooLargeException,
  type ArgumentsHost,
  type ExceptionFilter,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { AppError, Errors, TooManyAttemptsError } from '../errors.js';

// One owner for the error contract: every error leaves as { error: { code, message, details? } }.
// Never logs request bodies (they can contain passwords).
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger('Exceptions');

  catch(exception: unknown, host: ArgumentsHost): void {
    const http = host.switchToHttp();
    const res = http.getResponse<Response>();
    const req = http.getRequest<Request>();
    const error = this.toAppError(exception, req);

    if (error instanceof TooManyAttemptsError) {
      res.set('Retry-After', String(error.retryAfterSeconds));
    }
    res.status(error.status).json({
      error: {
        code: error.code,
        message: error.message,
        ...(error.details ? { details: error.details } : {}),
      },
    });
  }

  private toAppError(exception: unknown, req: Request): AppError {
    // Body-parser failures are converted to AppError in app.setup.ts before they get here.
    if (exception instanceof AppError) return exception;
    if (exception instanceof NotFoundException) return Errors.notFound();
    if (exception instanceof PayloadTooLargeException) return Errors.fileTooLarge();

    this.logger.error(
      `Unhandled error on ${req.method} ${req.path}`,
      exception instanceof Error ? exception.stack : String(exception),
    );
    return new AppError(500, 'INTERNAL', 'Something went wrong');
  }
}
