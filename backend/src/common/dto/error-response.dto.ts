import { applyDecorators } from '@nestjs/common';
import { ApiProperty, ApiPropertyOptional, ApiResponse } from '@nestjs/swagger';
import { ERROR_CATALOG, errorMessage, type ErrorCode } from '../http/error-catalog.js';

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

// The one error shape every endpoint uses (built by common/http/response-format.ts).
export class ErrorResponseDto {
  @ApiProperty({ type: ErrorBodyDto }) error!: ErrorBodyDto;
}

// Documents the errors an endpoint can return, by code. Status and text come from
// ERROR_CATALOG, so the docs change with it: ApiErrors('VALIDATION_ERROR', 'EMAIL_TAKEN').
export const ApiErrors = (...codes: ErrorCode[]) => {
  const byStatus = new Map<number, ErrorCode[]>();
  for (const code of codes) {
    const status = ERROR_CATALOG[code].status;
    byStatus.set(status, [...(byStatus.get(status) ?? []), code]);
  }
  return applyDecorators(
    ...[...byStatus].map(([status, group]) =>
      ApiResponse({
        status,
        type: ErrorResponseDto,
        description: group.map((code) => `${code}: ${errorMessage(code)}`).join(' · '),
      }),
    ),
  );
};
