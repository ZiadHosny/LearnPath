import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, Length, MaxLength } from 'class-validator';
import { Match } from '../../../common/decorators/match.decorator.js';
import { PasswordRule } from '../../../common/dto/password-rule.js';
import { Trim, TrimLowerCase } from '../../../common/dto/transforms.js';
import { PASSWORD_RULE_MESSAGE } from '../../../lib/password.js';

export class RegisterDto {
  @ApiProperty({ example: 'Ali Hassan', minLength: 2, maxLength: 100 })
  @Trim()
  @IsString({ message: 'Full name must be 2–100 characters' })
  @Length(2, 100, { message: 'Full name must be 2–100 characters' })
  fullName!: string;

  @ApiProperty({ example: 'ali@example.com', format: 'email', maxLength: 254, description: 'Stored lower-case; must be unique' })
  @TrimLowerCase()
  @IsString({ message: 'Enter a valid email' })
  @MaxLength(254, { message: 'Email is too long' })
  @IsEmail({}, { message: 'Enter a valid email' })
  email!: string;

  @ApiProperty({ example: 'abc12345', minLength: 8, description: PASSWORD_RULE_MESSAGE })
  @PasswordRule()
  password!: string;

  @ApiProperty({ example: 'abc12345', description: 'Must equal password' })
  @IsString({ message: 'Passwords do not match' })
  @Match('password', { message: 'Passwords do not match' })
  confirmPassword!: string;
}
