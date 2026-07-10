import type { Request, Response } from 'express';
import { RegisterUserUseCase } from '@use-cases/auth/RegisterUserUseCase';
import { LoginUserUseCase } from '@use-cases/auth/LoginUserUseCase';

export class AuthController {
  constructor(
    private readonly registerUser: RegisterUserUseCase,
    private readonly loginUser: LoginUserUseCase,
  ) {}

  register = async (req: Request, res: Response): Promise<void> => {
    const user = await this.registerUser.execute(req.body as never);
    res.status(201).json({
      id: user.id,
      email: user.email,
      createdAt: user.createdAt.toISOString(),
    });
  };

  login = async (req: Request, res: Response): Promise<void> => {
    const result = await this.loginUser.execute(req.body as never);
    res.status(200).json(result);
  };
}
