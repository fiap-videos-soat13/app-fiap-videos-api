import { ConflictException } from '@domain/exceptions/ValidationException';
import { UserRepository } from '@domain/repositories/VideoRepositories';
import { PasswordHasher } from '@domain/services/CoreServices';
import { ValidationService } from '@application/services/ValidationService';
import { UserRole } from '@domain/enums/UserRole';
import {
  RegisterUserSchema,
  type RegisterUserValidationType,
} from '@validators/AuthValidator';
import type { User } from '@domain/entities/User';

export class RegisterUserUseCase {
  constructor(
    private readonly users: UserRepository,
    private readonly passwordHasher: PasswordHasher,
    private readonly validation: ValidationService,
  ) {}

  async execute(input: RegisterUserValidationType): Promise<User> {
    const data = this.validation.validate(
      RegisterUserSchema,
      input,
      'RegisterUser',
    );

    const existing = await this.users.findByEmail(data.email);
    if (existing) {
      throw new ConflictException('E-mail já cadastrado');
    }

    const passwordHash = await this.passwordHasher.hash(data.password);
    const role = data.role === UserRole.Admin ? UserRole.Admin : UserRole.User;
    return this.users.create(data.email, passwordHash, role);
  }
}
