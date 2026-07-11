import { UnauthorizedException } from '@domain/exceptions/ValidationException';
import { UserRepository } from '@domain/repositories/VideoRepositories';
import {
  PasswordHasher,
  TokenService,
  ObservabilityMetricsService,
} from '@domain/services/CoreServices';
import { ValidationService } from '@application/services/ValidationService';
import {
  LoginUserSchema,
  type LoginUserValidationType,
} from '@validators/AuthValidator';

export type LoginResult = {
  accessToken: string;
  user: { id: string; email: string; role: string };
};

export class LoginUserUseCase {
  constructor(
    private readonly users: UserRepository,
    private readonly passwordHasher: PasswordHasher,
    private readonly tokens: TokenService,
    private readonly validation: ValidationService,
    private readonly metrics: ObservabilityMetricsService,
  ) {}

  async execute(input: LoginUserValidationType): Promise<LoginResult> {
    const data = this.validation.validate(LoginUserSchema, input, 'LoginUser');

    const user = await this.users.findByEmail(data.email);
    if (!user) {
      this.metrics.recordAuthLogin(false);
      throw new UnauthorizedException('Credenciais inválidas');
    }

    const valid = await this.passwordHasher.compare(
      data.password,
      user.passwordHash,
    );
    if (!valid) {
      this.metrics.recordAuthLogin(false);
      throw new UnauthorizedException('Credenciais inválidas');
    }

    this.metrics.recordAuthLogin(true);
    const accessToken = this.tokens.sign({
      sub: user.id,
      email: user.email,
      role: user.role,
    });

    return {
      accessToken,
      user: { id: user.id, email: user.email, role: user.role },
    };
  }
}
