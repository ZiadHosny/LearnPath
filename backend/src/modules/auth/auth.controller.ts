import { Body, Controller, HttpCode, Post, Req, Res } from '@nestjs/common';
import { ApiCookieAuth, ApiOkResponse, ApiCreatedResponse, ApiNoContentResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { Public } from '../../common/decorators/public.decorator.js';
import { ApiError } from '../../common/dto/error-response.dto.js';
import { AppError } from '../../common/errors.js';
import { AuthService } from './auth.service.js';
import { AuthResponseDto } from './dto/auth-response.dto.js';
import { LoginDto } from './dto/login.dto.js';
import { RegisterDto } from './dto/register.dto.js';
import { REFRESH_COOKIE, SessionService } from './session.service.js';

const SETS_COOKIE = 'Sets lp_refresh (HttpOnly, SameSite=Strict, Path=/api/auth, 7 days)';

@ApiTags('Auth')
@Public()
@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly sessions: SessionService,
  ) {}

  @Post('register')
  @HttpCode(201)
  @ApiOperation({ summary: 'Register a new Student account (US-01)' })
  @ApiCreatedResponse({ type: AuthResponseDto, description: `Account created and signed in. ${SETS_COOKIE}` })
  @ApiError(400, 'Some fields are invalid', 'VALIDATION_ERROR')
  @ApiError(409, 'Email already registered', 'EMAIL_TAKEN')
  async register(@Body() body: RegisterDto, @Res({ passthrough: true }) res: Response) {
    const { auth, refreshToken } = await this.auth.register(body);
    this.sessions.setRefreshCookie(res, refreshToken);
    return auth;
  }

  @Post('login')
  @HttpCode(200)
  @ApiOperation({ summary: 'Log in (US-02)' })
  @ApiOkResponse({ type: AuthResponseDto, description: `Signed in. ${SETS_COOKIE}` })
  @ApiError(400, 'Some fields are invalid', 'VALIDATION_ERROR')
  @ApiError(401, 'Invalid email or password', 'INVALID_CREDENTIALS')
  @ApiError(403, 'Account blocked', 'ACCOUNT_BLOCKED')
  @ApiError(429, 'Too many failed attempts; Retry-After header gives the seconds left', 'TOO_MANY_ATTEMPTS')
  async login(@Body() body: LoginDto, @Res({ passthrough: true }) res: Response) {
    const { auth, refreshToken } = await this.auth.login(body);
    this.sessions.setRefreshCookie(res, refreshToken);
    return auth;
  }

  @Post('refresh')
  @HttpCode(200)
  @ApiCookieAuth('refreshCookie')
  @ApiOperation({ summary: 'Renew the access token from the refresh cookie' })
  @ApiOkResponse({ type: AuthResponseDto, description: 'New access token with the current role' })
  @ApiError(401, 'Session ended or expired; cookie cleared', 'SESSION_EXPIRED')
  @ApiError(403, 'Account blocked; session ended, cookie cleared', 'ACCOUNT_BLOCKED')
  async refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    try {
      return await this.sessions.refresh(req.cookies?.[REFRESH_COOKIE]);
    } catch (error) {
      if (error instanceof AppError) this.sessions.clearRefreshCookie(res);
      throw error;
    }
  }

  @Post('logout')
  @HttpCode(204)
  @ApiCookieAuth('refreshCookie')
  @ApiOperation({ summary: 'Log out this device (US-03)' })
  @ApiNoContentResponse({ description: 'Session ended (always succeeds); cookie cleared' })
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response): Promise<void> {
    await this.sessions.endSession(req.cookies?.[REFRESH_COOKIE]);
    this.sessions.clearRefreshCookie(res);
  }
}
