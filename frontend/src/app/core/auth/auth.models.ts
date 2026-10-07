export type Role = 'STUDENT' | 'INSTRUCTOR' | 'ADMIN';

export interface User {
  id: string;
  fullName: string;
  email: string;
  role: Role;
  photoUrl: string | null;
  bio: string | null;
}

export interface AuthResponse {
  accessToken: string;
  expiresIn: number;
  user: User;
}
