import {
  Body,
  Controller,
  Get,
  HttpCode,
  Patch,
  Post,
  Put,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { memoryStorage } from 'multer';
import { CurrentUser, type AuthContext } from '../../common/decorators/current-user.decorator.js';
import { ApiErrors } from '../../common/dto/error-response.dto.js';
import { AppError } from '../../common/http/app-error.js';
import { ChangePasswordDto } from './dto/change-password.dto.js';
import { UpdateProfileDto } from './dto/update-profile.dto.js';
import { UserResponseDto } from './dto/user-response.dto.js';
import { MAX_PHOTO_BYTES, PhotoService } from './photo.service.js';
import { toUserDto } from './user.dto.js';
import { UsersService } from './users.service.js';

// Every endpoint here needs a login (global JwtAuthGuard); any role may call them.
@ApiTags('Profile')
@ApiBearerAuth('bearerAuth')
@ApiErrors('UNAUTHENTICATED')
@Controller('users')
export class UsersController {
  constructor(
    private readonly users: UsersService,
    private readonly photos: PhotoService,
  ) {}

  @Get('me')
  @ApiOperation({ summary: 'Get my profile (US-05)' })
  @ApiOkResponse({ type: UserResponseDto })
  async getMe(@CurrentUser() auth: AuthContext) {
    return toUserDto(await this.users.getMe(auth.userId));
  }

  @Patch('me')
  @ApiOperation({ summary: 'Update my name and bio; email cannot be changed (US-05)' })
  @ApiOkResponse({ type: UserResponseDto })
  @ApiErrors('VALIDATION_ERROR')
  async updateProfile(@CurrentUser() auth: AuthContext, @Body() body: UpdateProfileDto) {
    return toUserDto(await this.users.updateProfile(auth.userId, body));
  }

  @Put('me/photo')
  @ApiOperation({ summary: 'Upload my profile photo, JPG or PNG up to 2 MB (US-05)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['photo'],
      properties: { photo: { type: 'string', format: 'binary' } },
    },
  })
  @ApiOkResponse({ type: UserResponseDto, description: 'Updated user with the new photoUrl' })
  @ApiErrors('VALIDATION_ERROR')
  @ApiErrors('FILE_TOO_LARGE')
  @ApiErrors('UNSUPPORTED_FILE_TYPE')
  @UseInterceptors(
    FileInterceptor('photo', {
      storage: memoryStorage(),
      limits: { fileSize: MAX_PHOTO_BYTES, files: 1 },
    }),
  )
  async uploadPhoto(
    @CurrentUser() auth: AuthContext,
    @UploadedFile() file: Express.Multer.File | undefined,
  ) {
    if (!file) {
      throw new AppError('VALIDATION_ERROR', {
        messageKey: 'validation.photoRequired',
        details: [{ field: 'photo', message: 'validation.photoRequired' }],
      });
    }
    return toUserDto(await this.photos.savePhoto(auth.userId, file.buffer));
  }

  @Post('me/password')
  @HttpCode(204)
  @ApiOperation({ summary: 'Change my password; other devices are signed out (US-06)' })
  @ApiNoContentResponse({ description: 'Password changed' })
  @ApiErrors('INVALID_CURRENT_PASSWORD', 'VALIDATION_ERROR')
  async changePassword(
    @CurrentUser() auth: AuthContext,
    @Body() body: ChangePasswordDto,
  ): Promise<void> {
    await this.users.changePassword(auth.userId, auth.sessionId, body);
  }
}
