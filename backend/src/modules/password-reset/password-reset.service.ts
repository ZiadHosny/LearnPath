import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Errors } from '../../common/errors.js';
import type { EnvironmentVariables } from '../../config/env.validation.js';
import { MINUTE, now } from '../../lib/clock.js';
import { hashPassword } from '../../lib/password.js';
import { randomToken, sha256Hex } from '../../lib/tokens.js';
import { MailService } from '../../mail/mail.service.js';
import { PrismaService } from '../../prisma/prisma.service.js';

@Injectable()
export class PasswordResetService {
  private readonly logger = new Logger(PasswordResetService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly mail: MailService,
    private readonly config: ConfigService<EnvironmentVariables, true>,
  ) {}

  // Returns immediately; the email (if any) is sent afterwards so timing reveals nothing.
  async request(email: string): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { email },
      select: { id: true, email: true },
    });
    if (!user) return;

    const token = randomToken();
    const ttlMs = this.config.get('RESET_TOKEN_TTL_MINUTES', { infer: true }) * MINUTE;
    await this.prisma.$transaction([
      // Only the latest link works.
      this.prisma.passwordResetToken.deleteMany({ where: { userId: user.id, usedAt: null } }),
      this.prisma.passwordResetToken.create({
        data: {
          userId: user.id,
          tokenHash: sha256Hex(token),
          createdAt: now(),
          expiresAt: new Date(now().getTime() + ttlMs),
        },
      }),
    ]);

    const link = `${this.config.get('APP_URL', { infer: true })}/reset-password/${token}`;
    setImmediate(() => {
      this.mail.sendPasswordResetEmail(user.email, link).catch((error: unknown) => {
        // Never log the link: it is a credential.
        this.logger.error(`Failed to send password reset email: ${(error as Error).message}`);
      });
    });
  }

  private async findValid(token: string) {
    const record = await this.prisma.passwordResetToken.findUnique({
      where: { tokenHash: sha256Hex(token) },
    });
    if (!record || record.usedAt || record.expiresAt <= now()) throw Errors.linkExpired();
    return record;
  }

  async check(token: string): Promise<void> {
    await this.findValid(token);
  }

  // Sets the new password, marks the link used and ends every session. Status is untouched.
  async confirm(token: string, newPassword: string): Promise<void> {
    const record = await this.findValid(token);
    const passwordHash = await hashPassword(newPassword);
    const at = now();

    await this.prisma.$transaction(async (tx) => {
      // Guard against the same link being used twice at once.
      const used = await tx.passwordResetToken.updateMany({
        where: { id: record.id, usedAt: null },
        data: { usedAt: at },
      });
      if (used.count === 0) throw Errors.linkExpired();

      await tx.user.update({ where: { id: record.userId }, data: { passwordHash } });
      await tx.session.updateMany({
        where: { userId: record.userId, endedAt: null },
        data: { endedAt: at },
      });
    });
  }
}
