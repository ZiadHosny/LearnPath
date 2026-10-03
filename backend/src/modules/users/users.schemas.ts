import { z } from 'zod';
import { passwordRule } from '../../lib/password.js';
import { fullNameField } from '../auth/auth.schemas.js';

// Strict: any other field, including email, is refused (FR-017).
export const updateProfileSchema = z.strictObject({
  fullName: fullNameField.optional(),
  bio: z
    .string()
    .trim()
    .max(500, 'Bio must be 500 characters or fewer')
    .transform((value) => value || null)
    .nullable()
    .optional(),
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;

export const changePasswordSchema = z
  .strictObject({
    currentPassword: z.string().min(1, 'Current password is required').max(200),
    newPassword: passwordRule,
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    path: ['confirmPassword'],
    message: 'Passwords do not match',
  });

export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
