import { Injectable } from '@nestjs/common';
import { Errors } from '../../common/errors.js';
import { AppLogger } from '../../common/logging/app-logger.service.js';
import { now } from '../../lib/clock.js';
import { hashPassword, verifyPassword } from '../../lib/password.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import type { ChangePasswordDto } from './dto/change-password.dto.js';
import type { UpdateProfileDto } from './dto/update-profile.dto.js';

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: AppLogger,
  ) {}

  async getMe(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw Errors.unauthenticated();
    return user;
  }

  updateProfile(userId: string, input: UpdateProfileDto) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { fullName: input.fullName, bio: input.bio },
    });
  }

  // Keeps the current device signed in and ends every other session (FR-021a of 001).
  async changePassword(userId: string, sessionId: string, input: ChangePasswordDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      omit: { passwordHash: false },
    });
    if (!user) throw Errors.unauthenticated();
    if (!(await verifyPassword(input.currentPassword, user.passwordHash))) {
      throw Errors.invalidCurrentPassword();
    }

    const passwordHash = await hashPassword(input.newPassword);
    const [, ended] = await this.prisma.$transaction([
      this.prisma.user.update({ where: { id: userId }, data: { passwordHash } }),
      this.prisma.session.updateMany({
        where: { userId, id: { not: sessionId }, endedAt: null },
        data: { endedAt: now() },
      }),
    ]);
    this.logger.success('Password changed', {
      context: UsersService.name,
      story: 'US-06',
      userId,
      otherSessionsEnded: ended.count,
    });
  }
}
