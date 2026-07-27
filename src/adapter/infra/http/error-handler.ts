import type { Request, Response, NextFunction } from "express";
import {
  ValidationException,
  BusinessRuleException,
  EntityNotFoundException,
  ForbiddenException,
  UnauthorizedException,
  ConflictException,
} from "@domain/exceptions/ValidationException";

interface ErrorBody {
  statusCode: number;
  message: string;
  error?: string;
  errors?: Array<{ field: string; message: string; code: string }>;
  context?: string;
}

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  void _next;

  let body: ErrorBody;

  if (err instanceof ValidationException) {
    body = {
      statusCode: 400,
      message: err.message,
      errors: err.errors,
      context: err.context,
    };
  } else if (err instanceof UnauthorizedException) {
    body = { statusCode: 401, message: err.message, error: "UNAUTHORIZED" };
  } else if (err instanceof ForbiddenException) {
    body = { statusCode: 403, message: err.message, error: "FORBIDDEN" };
  } else if (err instanceof EntityNotFoundException) {
    body = { statusCode: 404, message: err.message, error: "NOT_FOUND" };
  } else if (err instanceof ConflictException) {
    body = { statusCode: 409, message: err.message, error: "CONFLICT" };
  } else if (err instanceof BusinessRuleException) {
    body = { statusCode: 400, message: err.message, error: "BUSINESS_RULE" };
  } else {
    console.error("Unhandled error:", err);
    body = {
      statusCode: 500,
      message: "Erro interno do servidor",
      error: "INTERNAL_ERROR",
    };
  }

  res.status(body.statusCode).json(body);
}
