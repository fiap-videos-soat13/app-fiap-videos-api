import type { Request, Response, NextFunction } from 'express';
import { TokenService } from '@domain/services/CoreServices';
import { UnauthorizedException } from '@domain/exceptions/ValidationException';
import type { AuthenticatedRequest } from './correlation.middleware';

export function createAuthMiddleware(tokens: TokenService) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const authed = req as AuthenticatedRequest;
    const header = req.header('authorization');
    if (!header?.startsWith('Bearer ')) {
      next(new UnauthorizedException('Token ausente'));
      return;
    }

    const token = header.slice('Bearer '.length).trim();
    try {
      const payload = tokens.verify(token);
      authed.userId = payload.sub;
      authed.userEmail = payload.email;
      next();
    } catch (err) {
      next(err);
    }
  };
}
