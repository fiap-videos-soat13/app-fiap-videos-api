import { z } from "zod";
import {
  ValidationErrorHandler,
  type ValidationError,
} from "@domain/services/ValidationErrorHandler";
import { ValidationException } from "@domain/exceptions/ValidationException";

export class ExpressValidationErrorHandler extends ValidationErrorHandler {
  handleValidationError(error: z.ZodError, context: string): never {
    const errors: ValidationError[] = error.issues.map((issue) => ({
      field: issue.path.join("."),
      message: issue.message,
      code: issue.code,
    }));
    throw new ValidationException("Dados inválidos", errors, context);
  }

  handleUnexpectedError(error: Error, context: string): never {
    throw new ValidationException(error.message, [], context);
  }
}
