import { ValidationPipe, type ValidationError } from '@nestjs/common';
import { AppError, type ErrorDetail } from '../errors.js';

function toDetails(errors: ValidationError[], parent = ''): ErrorDetail[] {
  return errors.flatMap((error) => {
    const field = parent ? `${parent}.${error.property}` : error.property;
    const own = Object.values(error.constraints ?? {}).map((message) => ({ field, message }));
    return [...own, ...toDetails(error.children ?? [], field)];
  });
}

// DTO validation with the 001 error shape: 400 VALIDATION_ERROR + details [{ field, message }].
// Unknown fields are refused (forbidNonWhitelisted), as the strict schemas did before.
export function createValidationPipe(): ValidationPipe {
  return new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
    exceptionFactory: (errors) =>
      new AppError(400, 'VALIDATION_ERROR', 'Some fields are invalid', toDetails(errors)),
  });
}
