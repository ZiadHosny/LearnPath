import { ValidationPipe, type ValidationError } from '@nestjs/common';
import { isTranslationKey } from '../../i18n/translate.js';
import { AppError, type ErrorDetail } from '../http/app-error.js';

// DTO messages are translation keys (validation.*). Built-in messages that are not keys become
// generic keys, so every detail can be translated: unknown fields → validation.unknownField,
// anything else → validation.invalidValue.
function toKey(constraint: string, message: string): string {
  if (isTranslationKey(message)) return message;
  return constraint === 'whitelistValidation' ? 'validation.unknownField' : 'validation.invalidValue';
}

function toDetails(errors: ValidationError[], parent = ''): ErrorDetail[] {
  return errors.flatMap((error) => {
    const field = parent ? `${parent}.${error.property}` : error.property;
    const own = Object.entries(error.constraints ?? {}).map(([constraint, message]) => ({
      field,
      message: toKey(constraint, message),
    }));
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
    exceptionFactory: (errors) => new AppError('VALIDATION_ERROR', { details: toDetails(errors) }),
  });
}
