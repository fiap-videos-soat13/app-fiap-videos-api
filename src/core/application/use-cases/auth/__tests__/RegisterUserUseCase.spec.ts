import { RegisterUserUseCase } from '@use-cases/auth/RegisterUserUseCase';
import { ConflictException } from '@domain/exceptions/ValidationException';
import { UserRole } from '@domain/enums/UserRole';
import { User } from '@domain/entities/User';
import type { UserRepository } from '@domain/repositories/VideoRepositories';
import type { PasswordHasher } from '@domain/services/CoreServices';
import type { ValidationService } from '@application/services/ValidationService';

describe('RegisterUserUseCase', () => {
  const createdUser = new User(
    '11111111-1111-4111-8111-111111111111',
    'new@fiap.com',
    'hash',
    UserRole.User,
    new Date(),
  );

  let users: jest.Mocked<UserRepository>;
  let hasher: jest.Mocked<PasswordHasher>;
  let validation: ValidationService;
  let useCase: RegisterUserUseCase;

  beforeEach(() => {
    users = {
      findByEmail: jest.fn(),
      findById: jest.fn(),
      create: jest.fn().mockResolvedValue(createdUser),
    };
    hasher = {
      hash: jest.fn().mockResolvedValue('hashed-password'),
      compare: jest.fn(),
    };
    validation = {
      validate: jest.fn((_schema, data: unknown) => data),
    } as unknown as ValidationService;

    useCase = new RegisterUserUseCase(users, hasher, validation);
  });

  it('creates user when e-mail is available', async () => {
    users.findByEmail.mockResolvedValue(null);

    const result = await useCase.execute({
      email: 'new@fiap.com',
      password: 'Secret12345',
      role: UserRole.User,
    });

    expect(result).toBe(createdUser);
    expect(hasher.hash).toHaveBeenCalledWith('Secret12345');
    expect(users.create).toHaveBeenCalledWith(
      'new@fiap.com',
      'hashed-password',
      UserRole.User,
    );
  });

  it('throws ConflictException when e-mail already exists', async () => {
    users.findByEmail.mockResolvedValue(createdUser);

    await expect(
      useCase.execute({
        email: 'new@fiap.com',
        password: 'Secret12345',
        role: UserRole.User,
      }),
    ).rejects.toBeInstanceOf(ConflictException);

    expect(users.create).not.toHaveBeenCalled();
  });

  it('defaults non-admin role to user', async () => {
    users.findByEmail.mockResolvedValue(null);

    await useCase.execute({
      email: 'new@fiap.com',
      password: 'Secret12345',
      role: 'invalid' as UserRole,
    });

    expect(users.create).toHaveBeenCalledWith(
      'new@fiap.com',
      'hashed-password',
      UserRole.User,
    );
  });
});
