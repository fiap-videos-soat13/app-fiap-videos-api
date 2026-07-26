import { z } from 'zod';
import { UserRole } from '@domain/enums/UserRole';
import { strongPasswordSchema } from '@validators/PasswordPolicy';

export const RegisterUserSchema = z.object({
  email: z.email(),
  password: strongPasswordSchema,
  role: z.enum([UserRole.Admin, UserRole.User]).optional(),
});

export const LoginUserSchema = z.object({
  email: z.email(),
  password: z.string().min(1),
});

export type RegisterUserValidationType = z.infer<typeof RegisterUserSchema>;
export type LoginUserValidationType = z.infer<typeof LoginUserSchema>;
