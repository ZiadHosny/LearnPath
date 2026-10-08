import { Body, Controller, Get, Param, Patch, Post, Put, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { memoryStorage } from 'multer';
import { CurrentUser, type AuthContext } from '../../common/decorators/current-user.decorator.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { ApiErrors } from '../../common/dto/error-response.dto.js';
import { IdParams } from '../../common/dto/id-params.js';
import { MAX_IMAGE_BYTES } from '../../common/files/image-storage.js';
import { AppError } from '../../common/http/app-error.js';
import { CoursesService } from './courses.service.js';
import { CourseDto, CreateCourseDto, MyCourseDto, UpdateCourseDto } from './dto/course.dto.js';

// Instructor course management (EP-03). Single courses: the owner or an admin (FR-012).
@ApiTags('Courses')
@ApiBearerAuth('bearerAuth')
@ApiErrors('UNAUTHENTICATED', 'FORBIDDEN')
@Controller('courses')
export class CoursesController {
  constructor(private readonly courses: CoursesService) {}

  @Post()
  @Roles('INSTRUCTOR')
  @ApiOperation({ summary: 'Create a course; it starts as a private Draft owned by me (US-12)' })
  @ApiCreatedResponse({ type: CourseDto })
  @ApiErrors('VALIDATION_ERROR')
  create(@CurrentUser() auth: AuthContext, @Body() body: CreateCourseDto) {
    return this.courses.create(auth.userId, body);
  }

  // Declared before ':id' so "mine" is not read as an id.
  @Get('mine')
  @Roles('INSTRUCTOR')
  @ApiOperation({ summary: 'My courses, most recently updated first (US-13)' })
  @ApiOkResponse({ type: [MyCourseDto] })
  mine(@CurrentUser() auth: AuthContext) {
    return this.courses.mine(auth.userId);
  }

  @Get(':id')
  @Roles('INSTRUCTOR', 'ADMIN')
  @ApiOperation({ summary: 'One course for editing; owner or admin (US-14)' })
  @ApiOkResponse({ type: CourseDto })
  @ApiErrors('VALIDATION_ERROR', 'NOT_FOUND')
  get(@CurrentUser() auth: AuthContext, @Param() params: IdParams) {
    return this.courses.get(params.id, auth);
  }

  @Patch(':id')
  @Roles('INSTRUCTOR', 'ADMIN')
  @ApiOperation({ summary: 'Edit course details with the creation rules; owner or admin (US-14)' })
  @ApiOkResponse({ type: CourseDto })
  @ApiErrors('VALIDATION_ERROR', 'NOT_FOUND')
  update(@CurrentUser() auth: AuthContext, @Param() params: IdParams, @Body() body: UpdateCourseDto) {
    return this.courses.update(params.id, auth, body);
  }

  @Put(':id/thumbnail')
  @Roles('INSTRUCTOR', 'ADMIN')
  @ApiOperation({ summary: 'Upload the course thumbnail, JPG or PNG up to 2 MB; replaces the old one (US-12, US-14)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['thumbnail'],
      properties: { thumbnail: { type: 'string', format: 'binary' } },
    },
  })
  @ApiOkResponse({ type: CourseDto })
  @ApiErrors('VALIDATION_ERROR', 'NOT_FOUND', 'FILE_TOO_LARGE', 'UNSUPPORTED_FILE_TYPE')
  @UseInterceptors(
    FileInterceptor('thumbnail', {
      storage: memoryStorage(),
      limits: { fileSize: MAX_IMAGE_BYTES, files: 1 },
    }),
  )
  async uploadThumbnail(
    @CurrentUser() auth: AuthContext,
    @Param() params: IdParams,
    @UploadedFile() file: Express.Multer.File | undefined,
  ) {
    if (!file) {
      throw new AppError('VALIDATION_ERROR', {
        messageKey: 'validation.thumbnailRequired',
        details: [{ field: 'thumbnail', message: 'validation.thumbnailRequired' }],
      });
    }
    return this.courses.setThumbnail(params.id, auth, file.buffer);
  }
}
