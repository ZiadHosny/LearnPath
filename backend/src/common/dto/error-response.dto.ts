import { applyDecorators } from '@nestjs/common';
import { ApiProperty, ApiPropertyOptional, ApiResponse } from '@nestjs/swagger';
import type { ErrorCode } from '../errors.js';

class ErrorDetailDto {
  @ApiProperty({ example: 'email' }) field!: string;
  @ApiProperty({ example: 'Enter a valid email' }) message!: string;
}

class ErrorBodyDto {
  @ApiProperty({ example: 'VALIDATION_ERROR' }) code!: string;
  @ApiProperty({ example: 'Some fields are invalid' }) message!: string;
  @ApiPropertyOptional({ type: [ErrorDetailDto], description: 'Only for VALIDATION_ERROR' })
  details?: ErrorDetailDto[];
}

// The one error shape every endpoint uses.
export class ErrorResponseDto {
  @ApiProperty({ type: ErrorBodyDto }) error!: ErrorBodyDto;
}

// Documents one error status with its codes, e.g. ApiError(409, 'Email already registered', 'EMAIL_TAKEN').
export const ApiError = (status: number, description: string, ...codes: ErrorCode[]) =>
  applyDecorators(
    ApiResponse({
      status,
      description: codes.length ? `${description} (${codes.join(', ')})` : description,
      type: ErrorResponseDto,
    }),
  );
