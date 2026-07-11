import type { Request, Response, NextFunction } from 'express';
import { TokenService } from '@domain/services/CoreServices';
import {
  ForbiddenException,
  UnauthorizedException,
} from '@domain/exceptions/ValidationException';
import { UserRole } from '@domain/enums/UserRole';
import type { AuthenticatedRequest } from './correlation.middleware';

const AUTH_COOKIE = 'fiap_token';

function parseCookies(req: Request): Record<string, string> {
  const header = req.header('cookie');
  if (!header) {
    return {};
  }

  return Object.fromEntries(
    header.split(';').map((part) => {
      const [key, ...rest] = part.trim().split('=');
      return [key, decodeURIComponent(rest.join('='))];
    }),
  );
}

export class AuthMiddleware {
  private static instance: AuthMiddleware | null = null;

  private constructor(private readonly tokens: TokenService) {}

  static initialize(tokens: TokenService): AuthMiddleware {
    if (!AuthMiddleware.instance) {
      AuthMiddleware.instance = new AuthMiddleware(tokens);
    }
    return AuthMiddleware.instance;
  }

  static getInstance(): AuthMiddleware {
    if (!AuthMiddleware.instance) {
      throw new Error('AuthMiddleware not initialized');
    }
    return AuthMiddleware.instance;
  }

  private extractToken(req: Request): string | null {
    const header = req.header('authorization');
    if (header?.startsWith('Bearer ')) {
      return header.slice('Bearer '.length).trim();
    }

    const cookies = parseCookies(req);
    const cookieToken = cookies[AUTH_COOKIE];
    return cookieToken && cookieToken.length > 0 ? cookieToken : null;
  }

  private applyAuth(
    req: AuthenticatedRequest,
    payload: { sub: string; email: string; role: string },
  ): void {
    req.userId = payload.sub;
    req.userEmail = payload.email;
    req.userRole = payload.role === UserRole.Admin ? UserRole.Admin : UserRole.User;
  }

  authenticateApi = (
    req: Request,
    _res: Response,
    next: NextFunction,
  ): void => {
    const authed = req as AuthenticatedRequest;
    const token = this.extractToken(req);
    if (!token) {
      next(new UnauthorizedException('Token ausente'));
      return;
    }

    try {
      const payload = this.tokens.verify(token);
      this.applyAuth(authed, payload);
      next();
    } catch (err) {
      next(err);
    }
  };

  requireAdmin = (
    req: Request,
    _res: Response,
    next: NextFunction,
  ): void => {
    const authed = req as AuthenticatedRequest;
    const token = this.extractToken(req);
    if (!token) {
      next(new UnauthorizedException('Token ausente'));
      return;
    }

    try {
      const payload = this.tokens.verify(token);
      this.applyAuth(authed, payload);
      if (authed.userRole !== UserRole.Admin) {
        next(new ForbiddenException('Apenas administradores podem registrar usuários'));
        return;
      }
      next();
    } catch (err) {
      next(err);
    }
  };

  protectPage = (req: Request, res: Response, next: NextFunction): void => {
    const token = this.extractToken(req);
    if (!token) {
      const redirect = encodeURIComponent(req.originalUrl);
      res.redirect(`/login?redirect=${redirect}`);
      return;
    }

    try {
      const payload = this.tokens.verify(token);
      this.applyAuth(req as AuthenticatedRequest, payload);
      next();
    } catch {
      const redirect = encodeURIComponent(req.originalUrl);
      res.redirect(`/login?redirect=${redirect}`);
    }
  };

  redirectIfAuthenticated = (
    req: Request,
    res: Response,
    next: NextFunction,
  ): void => {
    const token = this.extractToken(req);
    if (!token) {
      next();
      return;
    }

    try {
      this.tokens.verify(token);
      const redirectParam = req.query.redirect;
      const redirect =
        typeof redirectParam === 'string' && redirectParam.startsWith('/')
          ? redirectParam
          : '/status';
      res.redirect(redirect);
    } catch {
      next();
    }
  };

  static setAuthCookie(res: Response, token: string): void {
    res.setHeader(
      'Set-Cookie',
      `${AUTH_COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax`,
    );
  }

  static clearAuthCookie(res: Response): void {
    res.setHeader(
      'Set-Cookie',
      `${AUTH_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`,
    );
  }
}
