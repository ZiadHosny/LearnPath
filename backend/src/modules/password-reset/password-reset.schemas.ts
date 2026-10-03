import { z } from 'zod';
import { passwordRule } from '../../lib/password.js';

export const requestSchema = z.strictObject({
  email: z.string().trim().toLowerCase().min(1, 'Email is required').max(254),
});

export const tokenParams = z.object({
  token: z.string().min(1).max(200),
});

export const confirmSchema = z
  .strictObject({
    token: z.string().min(1).max(200),
    newPassword: passwordRule,
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    path: ['confirmPassword'],
    message: 'Passwords do not match',
  });
