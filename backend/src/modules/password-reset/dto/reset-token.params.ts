import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class ResetTokenParams {
  @ApiProperty({ description: 'Token from the reset link', maxLength: 200 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  token!: string;
}
