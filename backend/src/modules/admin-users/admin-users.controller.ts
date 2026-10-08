import { Body, Controller, Get, Param, Patch, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser, type AuthContext } from '../../common/decorators/current-user.decorator.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { ApiErrors } from '../../common/dto/error-response.dto.js';
import { IdParams } from '../../common/dto/id-params.js';
import { AdminUsersService } from './admin-users.service.js';
import { AdminUserDto, AdminUserPageDto, ChangeRoleDto, ListUsersQuery } from './dto/admin-users.dto.js';

@ApiTags('Admin')
@ApiBearerAuth('bearerAuth')
@ApiErrors('UNAUTHENTICATED', 'FORBIDDEN')
@Roles('ADMIN')
@Controller('admin/users')
export class AdminUsersController {
  constructor(private readonly users: AdminUsersService) {}

  @Get()
  @ApiOperation({ summary: 'List and search users, 20 per page, newest first (US-26 / US-25)' })
  @ApiOkResponse({ type: AdminUserPageDto })
  @ApiErrors('VALIDATION_ERROR')
  list(@Query() query: ListUsersQuery) {
    return this.users.list(query.search || undefined, query.page ?? 1);
  }

  @Patch(':id/role')
  @ApiOperation({ summary: "Change a user's role; applies at their next renewal (US-26)" })
  @ApiOkResponse({ type: AdminUserDto })
  @ApiErrors('VALIDATION_ERROR', 'CANNOT_CHANGE_OWN_ROLE', 'NOT_FOUND')
  changeRole(@CurrentUser() auth: AuthContext, @Param() params: IdParams, @Body() body: ChangeRoleDto) {
    return this.users.changeRole(auth.userId, params.id, body.role);
  }
}
