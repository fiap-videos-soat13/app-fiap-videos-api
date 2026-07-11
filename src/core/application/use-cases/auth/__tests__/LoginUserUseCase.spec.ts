import { LoginUserUseCase } from '@use-cases/auth/LoginUserUseCase';
import { UnauthorizedException } from '@domain/exceptions/ValidationException';
import { UserRole } from '@domain/enums/UserRole';
import { User } from '@domain/entities/User';
import type { UserRepository } from '@domain/repositories/VideoRepositories';
import type {
  PasswordHasher,
  TokenService,
  ObservabilityMetricsService,
} from '@domain/services/CoreServices';
import type { ValidationService } from '@application/services/ValidationService';

describe('LoginUserUseCase', () => {
  const user = new User(
    '11111111-1111-4111-8111-111111111111',
    'user@fiap.com',
    'hash',
    UserRole.User,
    new Date(),
  );

  let users: jest.Mocked<UserRepository>;
  let hasher: jest.Mocked<PasswordHasher>;
  let tokens: jest.Mocked<TokenService>;
  let validation: ValidationService;
  let recordAuthLogin: jest.Mock;
  let useCase: LoginUserUseCase;

  beforeEach(() => {
    users = {
      findByEmail: jest.fn(),
      findById: jest.fn(),
      create: jest.fn(),
    };
    hasher = {
      hash: jest.fn(),
      compare: jest.fn(),
    };
    tokens = {
      sign: jest.fn().mockReturnValue('token-abc'),
      verify: jest.fn(),
    };
    recordAuthLogin = jest.fn();
    const metrics: ObservabilityMetricsService = {
      recordVideoSubmitted: jest.fn(),
      recordAuthLogin,
    };
    validation = {
      validate: jest.fn((_schema, data: unknown) => data),
    } as unknown as ValidationService;

    useCase = new LoginUserUseCase(
      users,
      hasher,
      tokens,
      validation,
      metrics,
    );
  });

  it('retorna token quando credenciais são válidas', async () => {
    users.findByEmail.mockResolvedValue(user);
    hasher.compare.mockResolvedValue(true);

    const result = await useCase.execute({
      email: 'user@fiap.com',
      password: 'secret123',
    });

    expect(result.accessToken).toBe('token-abc');
    expect(recordAuthLogin).toHaveBeenCalledWith(true);
  });

  it('lança Unauthorized quando senha é inválida', async () => {
    users.findByEmail.mockResolvedValue(user);
    hasher.compare.mockResolvedValue(false);

    await expect(
      useCase.execute({ email: 'user@fiap.com', password: 'wrong' }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(recordAuthLogin).toHaveBeenCalledWith(false);
  });
});
