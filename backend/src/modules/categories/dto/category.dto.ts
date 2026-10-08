import { ApiProperty } from '@nestjs/swagger';
import { IsString, Length } from 'class-validator';
import { Trim } from '../../../common/dto/transforms.js';

export const CATEGORY_NAME_MIN = 2;
export const CATEGORY_NAME_MAX = 60;

// Used for both add and rename.
export class CategoryNameDto {
  @ApiProperty({ minLength: CATEGORY_NAME_MIN, maxLength: CATEGORY_NAME_MAX, example: 'Web Development' })
  @Trim()
  @IsString({ message: 'validation.categoryNameLength' })
  @Length(CATEGORY_NAME_MIN, CATEGORY_NAME_MAX, { message: 'validation.categoryNameLength' })
  name!: string;
}

export class CategoryDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty({ example: 'Web Development' }) name!: string;
  @ApiProperty({ example: 3, description: 'Courses in this category, any status' }) courseCount!: number;
}
