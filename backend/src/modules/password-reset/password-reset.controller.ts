import { Body, Controller, Get, HttpCode, Param, Post } from '@nestjs/common';
import {
  ApiAcceptedResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { Public } from '../../common/decorators/public.decorator.js';
import { ApiError } from '../../common/dto/error-response.dto.js';
import { ResetConfirmDto } from './dto/reset-confirm.dto.js';
import { ResetRequestDto } from './dto/reset-request.dto.js';
import { ResetTokenParams } from './dto/reset-token.params.js';
import { PasswordResetService } from './password-reset.service.js';

const SENT_MESSAGE = 'If an account exists for this email, a reset link has been sent.';

// Static routes are declared before ':token' so they are never read as a token.
@ApiTags('Password reset')
@Public()
@Controller('auth/password-reset')
export class PasswordResetController {
  constructor(private readonly passwordReset: PasswordResetService) {}

  @Post('request')
  @HttpCode(202)
  @ApiOperation({ summary: 'Email a reset link; same answer for any email (US-07)' })
  @ApiAcceptedResponse({
    description: 'Always the same message',
    schema: { type: 'object', properties: { message: { type: 'string', example: SENT_MESSAGE } } },
  })
  @ApiError(400, 'Some fields are invalid', 'VALIDATION_ERROR')
  async request(@Body() body: ResetRequestDto) {
    await this.passwordReset.request(body.email);
    return { message: SENT_MESSAGE };
  }

  @Post('confirm')
  @HttpCode(204)
  @ApiOperation({ summary: 'Set a new password with a reset link; all devices are signed out (US-07)' })
  @ApiNoContentResponse({ description: 'Password reset' })
  @ApiError(400, 'Some fields are invalid', 'VALIDATION_ERROR')
  @ApiError(410, 'Link expired', 'LINK_EXPIRED')
  async confirm(@Body() body: ResetConfirmDto): Promise<void> {
    await this.passwordReset.confirm(body.token, body.newPassword);
  }

  @Get(':token')
  @ApiOperation({ summary: 'Check whether a reset link is still valid (US-07)' })
  @ApiOkResponse({
    description: 'Link is valid',
    schema: { type: 'object', properties: { valid: { type: 'boolean', example: true } } },
  })
  @ApiError(410, 'Link expired', 'LINK_EXPIRED')
  async check(@Param() params: ResetTokenParams) {
    await this.passwordReset.check(params.token);
    return { valid: true };
  }
}
