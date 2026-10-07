import path from 'node:path';
import type { Role } from '../../generated/prisma/enums.js';

export interface UserDto {
  id: string;
  fullName: string;
  email: string;
  role: Role;
  photoUrl: string | null;
  bio: string | null;
}

interface UserLike {
  id: string;
  fullName: string;
  email: string;
  role: Role;
  photoPath: string | null;
  bio: string | null;
}

export function toUserDto(user: UserLike): UserDto {
  return {
    id: user.id,
    fullName: user.fullName,
    email: user.email,
    role: user.role,
    photoUrl: user.photoPath ? `/uploads/avatars/${path.basename(user.photoPath)}` : null,
    bio: user.bio,
  };
}
