import fs from 'node:fs/promises';
import path from 'node:path';
import { uploadsDir } from '../../config/paths.js';
import { randomToken } from '../../lib/tokens.js';
import { Errors } from '../http/app-error.js';

// Images users upload (profile photos, course thumbnails): JPG or PNG up to 2 MB, checked by
// their real content, stored under uploads/<folder>/ and served at /uploads/<folder>/<file>.
export const MAX_IMAGE_BYTES = 2 * 1024 * 1024;
export type ImageFolder = 'avatars' | 'thumbnails';

function detectType(bytes: Buffer): 'jpg' | 'png' | null {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return 'jpg';
  if (bytes.length >= 4 && bytes.subarray(0, 4).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47]))) {
    return 'png';
  }
  return null;
}

// Saves the image and returns its stored path, e.g. 'thumbnails/<id>-<random>.png'.
export async function saveImage(folder: ImageFolder, ownerId: string, bytes: Buffer): Promise<string> {
  const ext = detectType(bytes);
  if (!ext) throw Errors.unsupportedFileType();
  const dir = path.join(uploadsDir, folder);
  await fs.mkdir(dir, { recursive: true });
  const fileName = `${ownerId}-${randomToken()}.${ext}`;
  await fs.writeFile(path.join(dir, fileName), bytes);
  return `${folder}/${fileName}`;
}

// Removes a stored image; missing files are ignored. Only paths inside uploads/ are touched.
export async function removeImage(storedPath: string | null | undefined): Promise<void> {
  if (!storedPath) return;
  const [folder, file] = storedPath.split('/');
  if (!folder || !file) return;
  await fs.rm(path.join(uploadsDir, path.basename(folder), path.basename(file)), { force: true });
}

// Public URL of a stored image, or null.
export function imageUrl(storedPath: string | null | undefined): string | null {
  if (!storedPath) return null;
  const [folder, file] = storedPath.split('/');
  return folder && file ? `/uploads/${path.basename(folder)}/${path.basename(file)}` : null;
}
