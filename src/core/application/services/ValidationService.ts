import { z } from 'zod';
import {
  ValidationErrorHandler,
  type ValidationError,
} from '@domain/services/ValidationErrorHandler';

export interface ValidationResult<T> {
  success: boolean;
  data?: T;
  errors?: ValidationError[];
}

export class ValidationService {
  constructor(private readonly errorHandler: ValidationErrorHandler) {}

  validate<T>(
    schema: z.ZodSchema<T>,
    data: object | null | undefined,
    context: string,
  ): T {
    try {
      return schema.parse(data);
    } catch (error) {
      if (error instanceof z.ZodError) {
        this.errorHandler.handleValidationError(error, context);
      }
      const err = error instanceof Error ? error : new Error(String(error));
      this.errorHandler.handleUnexpectedError(err, context);
    }
  }

  safeValidate<T>(
    schema: z.ZodSchema<T>,
    data: object | null | undefined,
  ): ValidationResult<T> {
    try {
      const validatedData = schema.parse(data);
      return { success: true, data: validatedData };
    } catch (error) {
      if (error instanceof z.ZodError) {
        const validationErrors: ValidationError[] = error.issues.map(
          (issue) => ({
            field: issue.path.join('.'),
            message: issue.message,
            code: issue.code,
          }),
        );
        return { success: false, errors: validationErrors };
      }
      const errorObj = error instanceof Error ? error : new Error(String(error));
      return {
        success: false,
        errors: [{ field: '', message: errorObj.message, code: 'custom' }],
      };
    }
  }
}
