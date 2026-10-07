import fs from 'node:fs/promises';
import path from 'node:path';
import { Injectable } from '@nestjs/common';
import { Errors } from '../../common/errors.js';
import { avatarsDir } from '../../config/paths.js';
import { randomToken } from '../../lib/tokens.js';
import { PrismaService } from '../../prisma/prisma.service.js';

export const MAX_PHOTO_BYTES = 2 * 1024 * 1024;

// Checks the real content, not the file name or the browser-sent type.
function detectType(bytes: Buffer): 'jpg' | 'png' | null {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return 'jpg';
  if (bytes.length >= 4 && bytes.subarray(0, 4).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47]))) {
    return 'png';
  }
  return null;
}

@Injectable()
export class PhotoService {
  constructor(private readonly prisma: PrismaService) {}

  async savePhoto(userId: string, bytes: Buffer) {
    const ext = detectType(bytes);
    if (!ext) throw Errors.unsupportedFileType();

    await fs.mkdir(avatarsDir, { recursive: true });
    const fileName = `${userId}-${randomToken()}.${ext}`;
    await fs.writeFile(path.join(avatarsDir, fileName), bytes);

    const previous = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { photoPath: true },
    });
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: { photoPath: `avatars/${fileName}` },
    });

    if (previous?.photoPath) {
      await fs.rm(path.join(avatarsDir, path.basename(previous.photoPath)), { force: true });
    }
    return user;
  }
}
