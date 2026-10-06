import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, Length, MaxLength, ValidateIf } from 'class-validator';
import { Trim, TrimOrNull } from '../../../common/dto/transforms.js';

// Unknown fields (including email) are refused by the global pipe.
export class UpdateProfileDto {
  // Optional, but if sent it must be a valid name (null is not allowed).
  @ApiPropertyOptional({ example: 'Ali Hassan', minLength: 2, maxLength: 100 })
  @ValidateIf((_object, value) => value !== undefined)
  @Trim()
  @IsString({ message: 'Full name must be 2–100 characters' })
  @Length(2, 100, { message: 'Full name must be 2–100 characters' })
  fullName?: string;

  // Optional; null or an empty string clears it.
  @ApiPropertyOptional({ example: 'I love maths.', maxLength: 500, nullable: true, type: String })
  @IsOptional()
  @TrimOrNull()
  @IsString()
  @MaxLength(500, { message: 'Bio must be 500 characters or fewer' })
  bio?: string | null;
}
