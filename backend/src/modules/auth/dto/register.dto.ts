import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, Length, MaxLength } from 'class-validator';
import { Match } from '../../../common/decorators/match.decorator.js';
import { PasswordRule } from '../../../common/dto/password-rule.js';
import { Trim, TrimLowerCase } from '../../../common/dto/transforms.js';
import { PASSWORD_RULE_MESSAGE } from '../../../lib/password.js';

export class RegisterDto {
  @ApiProperty({ example: 'Ali Hassan', minLength: 2, maxLength: 100 })
  @Trim()
  @IsString({ message: 'validation.fullNameLength' })
  @Length(2, 100, { message: 'validation.fullNameLength' })
  fullName!: string;

  @ApiProperty({ example: 'ali@example.com', format: 'email', maxLength: 254, description: 'Stored lower-case; must be unique' })
  @TrimLowerCase()
  @IsString({ message: 'validation.emailInvalid' })
  @MaxLength(254, { message: 'validation.emailTooLong' })
  @IsEmail({}, { message: 'validation.emailInvalid' })
  email!: string;

  @ApiProperty({ example: 'abc12345', minLength: 8, description: PASSWORD_RULE_MESSAGE })
  @PasswordRule()
  password!: string;

  @ApiProperty({ example: 'abc12345', description: 'Must equal password' })
  @IsString({ message: 'validation.passwordsMismatch' })
  @Match('password', { message: 'validation.passwordsMismatch' })
  confirmPassword!: string;
}
