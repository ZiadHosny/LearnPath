import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, Length, MaxLength, ValidateIf } from 'class-validator';
import { Trim, TrimOrNull } from '../../../common/dto/transforms.js';
import { LANGUAGE_CODES } from '../../../i18n/languages.js';

// Unknown fields (including email) are refused by the global pipe.
export class UpdateProfileDto {
  // Optional, but if sent it must be a valid name (null is not allowed).
  @ApiPropertyOptional({ example: 'Ali Hassan', minLength: 2, maxLength: 100 })
  @ValidateIf((_object, value) => value !== undefined)
  @Trim()
  @IsString({ message: 'validation.fullNameLength' })
  @Length(2, 100, { message: 'validation.fullNameLength' })
  fullName?: string;

  // Optional; null or an empty string clears it.
  @ApiPropertyOptional({ example: 'I love maths.', maxLength: 500, nullable: true, type: String })
  @IsOptional()
  @TrimOrNull()
  @IsString()
  @MaxLength(500, { message: 'validation.bioTooLong' })
  bio?: string | null;

  // Optional preferred language (EP-06); one of the listed codes, or null to clear it.
  @ApiPropertyOptional({ enum: LANGUAGE_CODES, nullable: true, example: 'ar' })
  @IsOptional()
  @IsIn(LANGUAGE_CODES, { message: 'validation.languageInvalid' })
  language?: string | null;
}
