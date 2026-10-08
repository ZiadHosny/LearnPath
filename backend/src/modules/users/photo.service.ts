import { Injectable } from '@nestjs/common';
import { MAX_IMAGE_BYTES, removeImage, saveImage } from '../../common/files/image-storage.js';
import { PrismaService } from '../../prisma/prisma.service.js';

export const MAX_PHOTO_BYTES = MAX_IMAGE_BYTES;

@Injectable()
export class PhotoService {
  constructor(private readonly prisma: PrismaService) {}

  async savePhoto(userId: string, bytes: Buffer) {
    const photoPath = await saveImage('avatars', userId, bytes);
    const previous = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { photoPath: true },
    });
    const user = await this.prisma.user.update({ where: { id: userId }, data: { photoPath } });
    await removeImage(previous?.photoPath);
    return user;
  }
}
