import { applyDecorators } from '@nestjs/common';
import { IsString, Matches, MinLength } from 'class-validator';
import { PASSWORD_RULE_MESSAGE } from '../../lib/password.js';

// At least 8 characters with a letter and a number (US-01), one message for every failure.
export const PasswordRule = () =>
  applyDecorators(
    IsString({ message: PASSWORD_RULE_MESSAGE }),
    MinLength(8, { message: PASSWORD_RULE_MESSAGE }),
    Matches(/[A-Za-z]/, { message: PASSWORD_RULE_MESSAGE }),
    Matches(/[0-9]/, { message: PASSWORD_RULE_MESSAGE }),
  );
