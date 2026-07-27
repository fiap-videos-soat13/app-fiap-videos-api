import { z } from "zod";

export const strongPasswordSchema = z
  .string()
  .min(8, "Senha deve ter no mínimo 8 caracteres")
  .regex(/[a-z]/, "Senha deve conter letra minúscula")
  .regex(/[A-Z]/, "Senha deve conter letra maiúscula")
  .regex(/[0-9]/, "Senha deve conter número");
