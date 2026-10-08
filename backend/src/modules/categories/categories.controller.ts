import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser, type AuthContext } from '../../common/decorators/current-user.decorator.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { ApiErrors } from '../../common/dto/error-response.dto.js';
import { IdParams } from '../../common/dto/id-params.js';
import { CategoriesService } from './categories.service.js';
import { CategoryDto, CategoryNameDto } from './dto/category.dto.js';

@ApiTags('Categories')
@ApiBearerAuth('bearerAuth')
@ApiErrors('UNAUTHENTICATED')
@Controller('categories')
export class CategoriesController {
  constructor(private readonly categories: CategoriesService) {}

  @Get()
  @ApiOperation({ summary: 'All categories sorted by name, with course counts; any signed-in user (US-27)' })
  @ApiOkResponse({ type: [CategoryDto] })
  list() {
    return this.categories.list();
  }

  @Post()
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Add a category; names are unique ignoring case (US-27)' })
  @ApiCreatedResponse({ type: CategoryDto })
  @ApiErrors('FORBIDDEN', 'VALIDATION_ERROR', 'CATEGORY_EXISTS')
  create(@CurrentUser() auth: AuthContext, @Body() body: CategoryNameDto) {
    return this.categories.create(body.name, auth.userId);
  }

  @Patch(':id')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Rename a category (US-27)' })
  @ApiOkResponse({ type: CategoryDto })
  @ApiErrors('FORBIDDEN', 'VALIDATION_ERROR', 'NOT_FOUND', 'CATEGORY_EXISTS')
  rename(@CurrentUser() auth: AuthContext, @Param() params: IdParams, @Body() body: CategoryNameDto) {
    return this.categories.rename(params.id, body.name, auth.userId);
  }

  @Delete(':id')
  @HttpCode(204)
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Delete a category that no course uses (US-27)' })
  @ApiNoContentResponse({ description: 'Deleted' })
  @ApiErrors('FORBIDDEN', 'VALIDATION_ERROR', 'NOT_FOUND', 'CATEGORY_IN_USE')
  async remove(@CurrentUser() auth: AuthContext, @Param() params: IdParams) {
    await this.categories.remove(params.id, auth.userId);
  }
}
