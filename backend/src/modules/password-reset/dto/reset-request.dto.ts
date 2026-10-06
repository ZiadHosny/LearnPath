import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { TrimLowerCase } from '../../../common/dto/transforms.js';

export class ResetRequestDto {
  @ApiProperty({ example: 'student@learnpath.local', maxLength: 254 })
  @TrimLowerCase()
  @IsString({ message: 'Email is required' })
  @IsNotEmpty({ message: 'Email is required' })
  @MaxLength(254)
  email!: string;
}
