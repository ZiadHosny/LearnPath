import path from 'node:path';

// Scripts run from the backend/ folder (npm run dev, npm test, npm start).
// Tests point UPLOADS_DIR at a temporary folder so they never touch real uploads.
export const uploadsDir = path.resolve(process.env.UPLOADS_DIR ?? path.join(process.cwd(), 'uploads'));
export const avatarsDir = path.join(uploadsDir, 'avatars');
export const thumbnailsDir = path.join(uploadsDir, 'thumbnails');
