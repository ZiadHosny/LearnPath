import { Injectable } from '@nestjs/common';
import { Errors } from '../../common/http/app-error.js';
import { AppLogger } from '../../common/logging/app-logger.service.js';
import type { Prisma } from '../../generated/prisma/client.js';
import type { Role } from '../../generated/prisma/enums.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { USERS_PAGE_SIZE } from './dto/admin-users.dto.js';

const ADMIN_USER_FIELDS = { id: true, fullName: true, email: true, role: true } as const;

@Injectable()
export class AdminUsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: AppLogger,
  ) {}

  // Minimal US-25 slice for US-26: newest first, searchable by name or email.
  async list(search: string | undefined, page = 1) {
    const where: Prisma.UserWhereInput = search
      ? {
          OR: [
            { fullName: { contains: search, mode: 'insensitive' } },
            { email: { contains: search, mode: 'insensitive' } },
          ],
        }
      : {};
    const [items, total] = await this.prisma.$transaction([
      this.prisma.user.findMany({
        where,
        select: ADMIN_USER_FIELDS,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        skip: (page - 1) * USERS_PAGE_SIZE,
        take: USERS_PAGE_SIZE,
      }),
      this.prisma.user.count({ where }),
    ]);
    return { items, total, page, pageSize: USERS_PAGE_SIZE };
  }

  // The new role applies at the user's next renewal (renewal reads the current role).
  async changeRole(adminId: string, userId: string, role: Role) {
    if (adminId === userId) throw Errors.cannotChangeOwnRole();
    const exists = await this.prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
    if (!exists) throw Errors.notFound();
    const user = await this.prisma.user.update({ where: { id: userId }, data: { role }, select: ADMIN_USER_FIELDS });
    this.logger.success('Role changed', {
      context: AdminUsersService.name,
      story: 'US-26',
      userId,
      by: adminId,
      from: exists.role,
      to: role,
    });
    return user;
  }
}
