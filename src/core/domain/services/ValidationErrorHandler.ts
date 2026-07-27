import { z } from "zod";

export interface ValidationError {
  field: string;
  message: string;
  code: string;
}

export abstract class ValidationErrorHandler {
  abstract handleValidationError(error: z.ZodError, context: string): never;
  abstract handleUnexpectedError(error: Error, context: string): never;
}
