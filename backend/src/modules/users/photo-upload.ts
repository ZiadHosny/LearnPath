import fs from 'node:fs/promises';
import path from 'node:path';
import type { RequestHandler } from 'express';
import multer from 'multer';
import { avatarsDir } from '../../config/paths.js';
import { prisma } from '../../db/prisma.js';
import { AppError, Errors } from '../../lib/errors.js';
import { randomToken } from '../../lib/tokens.js';

const MAX_BYTES = 2 * 1024 * 1024;

const receive = multer({ storage: multer.memoryStorage(), limits: { fileSize: MAX_BYTES, files: 1 } })
  .single('photo');

// Multer errors become our uniform API errors.
export const receivePhoto: RequestHandler = (req, res, next) => {
  receive(req, res, (error: unknown) => {
    if (error instanceof multer.MulterError && error.code === 'LIMIT_FILE_SIZE') {
      return next(Errors.fileTooLarge());
    }
    if (error) return next(error);
    if (!req.file) {
      return next(new AppError(400, 'VALIDATION_ERROR', 'Choose a photo to upload', [
        { field: 'photo', message: 'Choose a photo to upload' },
      ]));
    }
    next();
  });
};

// Checks the real content, not the file name or the browser-sent type.
function detectType(bytes: Buffer): 'jpg' | 'png' | null {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return 'jpg';
  if (bytes.length >= 4 && bytes.subarray(0, 4).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47]))) {
    return 'png';
  }
  return null;
}

export async function savePhoto(userId: string, bytes: Buffer) {
  const ext = detectType(bytes);
  if (!ext) throw Errors.unsupportedFileType();

  await fs.mkdir(avatarsDir, { recursive: true });
  const fileName = `${userId}-${randomToken()}.${ext}`;
  await fs.writeFile(path.join(avatarsDir, fileName), bytes);

  const previous = await prisma.user.findUnique({ where: { id: userId }, select: { photoPath: true } });
  const user = await prisma.user.update({
    where: { id: userId },
    data: { photoPath: `avatars/${fileName}` },
  });

  if (previous?.photoPath) {
    await fs.rm(path.join(avatarsDir, path.basename(previous.photoPath)), { force: true });
  }
  return user;
}
