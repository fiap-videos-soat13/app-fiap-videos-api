import type { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'node:crypto';

export type AuthenticatedRequest = Request & {
  correlationId?: string;
  userId?: string;
  userEmail?: string;
  userRole?: string;
};

export function correlationMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const incoming = req.header('x-correlation-id');
  const correlationId = incoming?.trim() || randomUUID();
  (req as AuthenticatedRequest).correlationId = correlationId;
  res.setHeader('x-correlation-id', correlationId);
  next();
}
