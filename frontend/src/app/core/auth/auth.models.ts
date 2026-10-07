export type Role = 'STUDENT' | 'INSTRUCTOR' | 'ADMIN';

export interface User {
  id: string;
  fullName: string;
  email: string;
  role: Role;
  photoUrl: string | null;
  bio: string | null;
  language?: string | null; // preferred language saved on the account (EP-06)
}

export interface AuthResponse {
  accessToken: string;
  expiresIn: number;
  user: User;
}
