import { z } from 'zod';

export const RegisterUserSchema = z.object({
  email: z.email(),
  password: z.string().min(8, 'Senha deve ter no mínimo 8 caracteres'),
});

export const LoginUserSchema = z.object({
  email: z.email(),
  password: z.string().min(1),
});

export type RegisterUserValidationType = z.infer<typeof RegisterUserSchema>;
export type LoginUserValidationType = z.infer<typeof LoginUserSchema>;
