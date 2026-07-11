import bcrypt from 'bcryptjs';
import jwt, { type SignOptions } from 'jsonwebtoken';
import { PasswordHasher, TokenService } from '@domain/services/CoreServices';
import { UnauthorizedException } from '@domain/exceptions/ValidationException';

export class BcryptPasswordHasher extends PasswordHasher {
  async hash(plain: string): Promise<string> {
    return bcrypt.hash(plain, 10);
  }

  async compare(plain: string, hash: string): Promise<boolean> {
    return bcrypt.compare(plain, hash);
  }
}

type JwtPayload = { sub: string; email: string; role: string };

export class JwtTokenService extends TokenService {
  constructor(
    private readonly secret: string,
    private readonly expiresIn: string,
  ) {
    super();
  }

  sign(payload: JwtPayload): string {
    const options: SignOptions = {
      expiresIn: this.expiresIn as SignOptions['expiresIn'],
    };
    return jwt.sign(payload, this.secret, options);
  }

  verify(token: string): JwtPayload {
    try {
      const decoded = jwt.verify(token, this.secret);
      if (
        typeof decoded !== 'object' ||
        decoded === null ||
        !('sub' in decoded) ||
        !('email' in decoded) ||
        !('role' in decoded) ||
        typeof decoded.sub !== 'string' ||
        typeof decoded.email !== 'string' ||
        typeof decoded.role !== 'string'
      ) {
        throw new UnauthorizedException('Token inválido');
      }
      return {
        sub: decoded.sub,
        email: decoded.email,
        role: decoded.role,
      };
    } catch {
      throw new UnauthorizedException('Token inválido');
    }
  }
}
