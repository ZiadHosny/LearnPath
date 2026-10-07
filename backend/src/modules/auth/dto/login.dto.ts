import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { TrimLowerCase } from '../../../common/dto/transforms.js';

// No email-format check here (as in 001): any wrong input is just "Invalid email or password".
export class LoginDto {
  @ApiProperty({ example: 'student@learnpath.local', maxLength: 254 })
  @TrimLowerCase()
  @IsString({ message: 'Email is required' })
  @IsNotEmpty({ message: 'Email is required' })
  @MaxLength(254)
  email!: string;

  @ApiProperty({ example: 'Passw0rd!', maxLength: 200 })
  @IsString({ message: 'Password is required' })
  @IsNotEmpty({ message: 'Password is required' })
  @MaxLength(200)
  password!: string;
}
