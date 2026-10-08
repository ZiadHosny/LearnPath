import { applyDecorators } from '@nestjs/common';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { ArrayMaxSize, IsArray, IsIn, IsOptional, IsString, IsUUID, Length, MaxLength, ValidateIf } from 'class-validator';
import { Trim, TrimOrNull } from '../../../common/dto/transforms.js';

export const COURSE_LEVELS = ['BEGINNER', 'INTERMEDIATE', 'ADVANCED'] as const;
export const COURSE_STATUSES = ['DRAFT', 'PUBLISHED', 'ARCHIVED'] as const;
export const COURSE_LIMITS = {
  title: 120,
  shortDescription: 250,
  description: 5000,
  outcomes: 10,
  outcome: 120,
} as const;

export type CourseLevel = (typeof COURSE_LEVELS)[number];

// Field rules shared by create (required) and edit (optional, but never null) — FR-008 / FR-012.
const sentOnEdit = () => ValidateIf((_object, value) => value !== undefined);

const TitleRules = () =>
  applyDecorators(
    Trim(),
    IsString({ message: 'validation.titleLength' }),
    Length(1, COURSE_LIMITS.title, { message: 'validation.titleLength' }),
  );

const ShortDescriptionRules = () =>
  applyDecorators(
    Trim(),
    IsString({ message: 'validation.shortDescriptionLength' }),
    Length(1, COURSE_LIMITS.shortDescription, { message: 'validation.shortDescriptionLength' }),
  );

const CategoryRules = () => IsUUID('all', { message: 'validation.categoryInvalid' });

const LevelRules = () => IsIn(COURSE_LEVELS, { message: 'validation.levelInvalid' });

// Optional; null or an empty string clears it.
const DescriptionRules = () =>
  applyDecorators(
    IsOptional(),
    TrimOrNull(),
    IsString({ message: 'validation.descriptionTooLong' }),
    MaxLength(COURSE_LIMITS.description, { message: 'validation.descriptionTooLong' }),
  );

// Items are trimmed and blank ones dropped before the limits are checked.
const OutcomesRules = () =>
  applyDecorators(
    IsOptional(),
    Transform(({ value }) =>
      Array.isArray(value)
        ? value.map((item) => (typeof item === 'string' ? item.trim() : item)).filter((item) => item !== '')
        : value,
    ),
    IsArray({ message: 'validation.outcomesTooMany' }),
    ArrayMaxSize(COURSE_LIMITS.outcomes, { message: 'validation.outcomesTooMany' }),
    IsString({ each: true, message: 'validation.outcomeTooLong' }),
    MaxLength(COURSE_LIMITS.outcome, { each: true, message: 'validation.outcomeTooLong' }),
  );

export class CreateCourseDto {
  @ApiProperty({ minLength: 1, maxLength: COURSE_LIMITS.title, example: 'Angular from zero' })
  @TitleRules()
  title!: string;

  @ApiProperty({ minLength: 1, maxLength: COURSE_LIMITS.shortDescription, example: 'Build real apps with Angular' })
  @ShortDescriptionRules()
  shortDescription!: string;

  @ApiProperty({ format: 'uuid', description: 'An existing category' })
  @CategoryRules()
  categoryId!: string;

  @ApiProperty({ enum: COURSE_LEVELS, example: 'BEGINNER' })
  @LevelRules()
  level!: CourseLevel;

  @ApiPropertyOptional({ maxLength: COURSE_LIMITS.description, nullable: true, type: String })
  @DescriptionRules()
  description?: string | null;

  @ApiPropertyOptional({ type: [String], maxItems: COURSE_LIMITS.outcomes, description: 'What you will learn' })
  @OutcomesRules()
  learningOutcomes?: string[];
}

// Same rules as create; send only what changes. The status is not editable here.
export class UpdateCourseDto {
  @ApiPropertyOptional({ minLength: 1, maxLength: COURSE_LIMITS.title })
  @sentOnEdit()
  @TitleRules()
  title?: string;

  @ApiPropertyOptional({ minLength: 1, maxLength: COURSE_LIMITS.shortDescription })
  @sentOnEdit()
  @ShortDescriptionRules()
  shortDescription?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @sentOnEdit()
  @CategoryRules()
  categoryId?: string;

  @ApiPropertyOptional({ enum: COURSE_LEVELS })
  @sentOnEdit()
  @LevelRules()
  level?: CourseLevel;

  @ApiPropertyOptional({ maxLength: COURSE_LIMITS.description, nullable: true, type: String })
  @DescriptionRules()
  description?: string | null;

  @ApiPropertyOptional({ type: [String], maxItems: COURSE_LIMITS.outcomes })
  @OutcomesRules()
  learningOutcomes?: string[];
}

class CourseCategoryDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty({ example: 'Web Development' }) name!: string;
}

export class CourseDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty() title!: string;
  @ApiProperty() shortDescription!: string;
  @ApiProperty({ nullable: true, type: String }) description!: string | null;
  @ApiProperty({ type: [String] }) learningOutcomes!: string[];
  @ApiProperty({ enum: COURSE_LEVELS }) level!: string;
  @ApiProperty({ type: CourseCategoryDto }) category!: CourseCategoryDto;
  @ApiProperty({ nullable: true, type: String, example: '/uploads/thumbnails/abc.png' }) thumbnailUrl!: string | null;
  @ApiProperty({ enum: COURSE_STATUSES }) status!: string;
  @ApiProperty({ format: 'uuid' }) ownerId!: string;
  @ApiProperty() createdAt!: Date;
  @ApiProperty() updatedAt!: Date;
}

export class MyCourseDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty() title!: string;
  @ApiProperty({ enum: COURSE_STATUSES }) status!: string;
  @ApiProperty({ nullable: true, type: String }) thumbnailUrl!: string | null;
  @ApiProperty({ example: 0, description: 'Lessons arrive in Sprint 3; 0 until then' }) lessonCount!: number;
  @ApiProperty({ example: 0, description: 'Enrollments arrive in Sprint 5; 0 until then' }) studentCount!: number;
  @ApiProperty() updatedAt!: Date;
}
