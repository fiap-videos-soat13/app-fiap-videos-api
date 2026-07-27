export { LoggerPort as LoggerService } from "@domain/outboundPorts/LoggerPort";

export abstract class ObservabilityMetricsService {
  abstract recordVideoSubmitted(): void;
  abstract recordAuthLogin(success: boolean): void;
}

export abstract class CachePort {
  abstract getJson<T>(key: string): Promise<T | null>;
  abstract setJson<T>(key: string, value: T, ttlSeconds: number): Promise<void>;
  abstract delete(key: string): Promise<void>;
}

export abstract class PasswordHasher {
  abstract hash(plain: string): Promise<string>;
  abstract compare(plain: string, hash: string): Promise<boolean>;
}

export type TokenPayload = {
  sub: string;
  email: string;
  role: string;
};

export abstract class TokenService {
  abstract sign(payload: TokenPayload): string;
  abstract verify(token: string): TokenPayload;
}
