import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';
import { Trim } from '../../../common/dto/transforms.js';

export const ROLES = ['STUDENT', 'INSTRUCTOR', 'ADMIN'] as const;
export const USERS_PAGE_SIZE = 20;

export class ListUsersQuery {
  @ApiPropertyOptional({ description: 'Part of the name or email (case-insensitive)', example: 'mona' })
  @IsOptional()
  @Trim()
  @IsString()
  @MaxLength(100)
  search?: string;

  @ApiPropertyOptional({ minimum: 1, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;
}

export class ChangeRoleDto {
  @ApiProperty({ enum: ROLES, example: 'INSTRUCTOR' })
  @IsIn(ROLES, { message: 'validation.roleInvalid' })
  role!: (typeof ROLES)[number];
}

export class AdminUserDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty({ example: 'Mona Saleh' }) fullName!: string;
  @ApiProperty({ example: 'mona@example.com' }) email!: string;
  @ApiProperty({ enum: ROLES }) role!: string;
}

export class AdminUserPageDto {
  @ApiProperty({ type: [AdminUserDto] }) items!: AdminUserDto[];
  @ApiProperty({ example: 42 }) total!: number;
  @ApiProperty({ example: 1 }) page!: number;
  @ApiProperty({ example: USERS_PAGE_SIZE }) pageSize!: number;
}
