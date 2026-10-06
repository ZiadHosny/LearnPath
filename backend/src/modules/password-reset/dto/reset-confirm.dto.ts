import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { Match } from '../../../common/decorators/match.decorator.js';
import { PasswordRule } from '../../../common/dto/password-rule.js';
import { PASSWORD_RULE_MESSAGE } from '../../../lib/password.js';

export class ResetConfirmDto {
  @ApiProperty({ example: '<token from the email link>', maxLength: 200 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  token!: string;

  @ApiProperty({ example: 'newpass22', minLength: 8, description: PASSWORD_RULE_MESSAGE })
  @PasswordRule()
  newPassword!: string;

  @ApiProperty({ example: 'newpass22', description: 'Must equal newPassword' })
  @IsString({ message: 'Passwords do not match' })
  @Match('newPassword', { message: 'Passwords do not match' })
  confirmPassword!: string;
}
