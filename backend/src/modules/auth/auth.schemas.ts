import { z } from 'zod';
import { passwordRule } from '../../lib/password.js';

export const emailField = z
  .string()
  .trim()
  .toLowerCase()
  .max(254, 'Email is too long')
  .pipe(z.email('Enter a valid email'));

export const fullNameField = z
  .string()
  .trim()
  .min(2, 'Full name must be 2–100 characters')
  .max(100, 'Full name must be 2–100 characters');

export const registerSchema = z
  .strictObject({
    fullName: fullNameField,
    email: emailField,
    password: passwordRule,
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    path: ['confirmPassword'],
    message: 'Passwords do not match',
  });

export type RegisterInput = z.infer<typeof registerSchema>;

export const loginSchema = z.strictObject({
  email: z.string().trim().toLowerCase().min(1, 'Email is required').max(254),
  password: z.string().min(1, 'Password is required').max(200),
});

export type LoginInput = z.infer<typeof loginSchema>;
