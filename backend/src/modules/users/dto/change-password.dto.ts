import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { Match } from '../../../common/decorators/match.decorator.js';
import { PasswordRule } from '../../../common/dto/password-rule.js';
import { PASSWORD_RULE_MESSAGE } from '../../../lib/password.js';

export class ChangePasswordDto {
  @ApiProperty({ example: 'Passw0rd!', maxLength: 200 })
  @IsString({ message: 'Current password is required' })
  @IsNotEmpty({ message: 'Current password is required' })
  @MaxLength(200)
  currentPassword!: string;

  @ApiProperty({ example: 'newpass22', minLength: 8, description: PASSWORD_RULE_MESSAGE })
  @PasswordRule()
  newPassword!: string;

  @ApiProperty({ example: 'newpass22', description: 'Must equal newPassword' })
  @IsString({ message: 'Passwords do not match' })
  @Match('newPassword', { message: 'Passwords do not match' })
  confirmPassword!: string;
}
