import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { Match } from '../../../common/decorators/match.decorator.js';
import { PasswordRule } from '../../../common/dto/password-rule.js';
import { PASSWORD_RULE_MESSAGE } from '../../../lib/password.js';

export class ChangePasswordDto {
  @ApiProperty({ example: 'Passw0rd!', maxLength: 200 })
  @IsString({ message: 'validation.currentPasswordRequired' })
  @IsNotEmpty({ message: 'validation.currentPasswordRequired' })
  @MaxLength(200)
  currentPassword!: string;

  @ApiProperty({ example: 'newpass22', minLength: 8, description: PASSWORD_RULE_MESSAGE })
  @PasswordRule()
  newPassword!: string;

  @ApiProperty({ example: 'newpass22', description: 'Must equal newPassword' })
  @IsString({ message: 'validation.passwordsMismatch' })
  @Match('newPassword', { message: 'validation.passwordsMismatch' })
  confirmPassword!: string;
}
