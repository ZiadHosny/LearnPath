import { applyDecorators } from '@nestjs/common';
import { IsString, Matches, MinLength } from 'class-validator';

// At least 8 characters with a letter and a number (US-01), one message for every failure.
// Messages are translation keys (src/i18n/locales/*.ts → validation.*).
export const PasswordRule = () =>
  applyDecorators(
    IsString({ message: 'validation.passwordRule' }),
    MinLength(8, { message: 'validation.passwordRule' }),
    Matches(/[A-Za-z]/, { message: 'validation.passwordRule' }),
    Matches(/[0-9]/, { message: 'validation.passwordRule' }),
  );
