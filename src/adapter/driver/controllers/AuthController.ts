import type { Request, Response } from "express";
import { RegisterUserUseCase } from "@use-cases/auth/RegisterUserUseCase";
import { LoginUserUseCase } from "@use-cases/auth/LoginUserUseCase";
import { AuthMiddleware } from "@adapter/infra/http/middleware/auth.middleware";
import { UnauthorizedException } from "@domain/exceptions/ValidationException";

function readFormField(body: unknown, key: string): string {
  if (typeof body !== "object" || body === null || !(key in body)) {
    return "";
  }
  const value = (body as Record<string, unknown>)[key];
  return typeof value === "string" ? value : "";
}

function readRedirect(body: unknown): string {
  const redirect = readFormField(body, "redirect");
  return redirect.startsWith("/") ? redirect : "/status";
}

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
      role: user.role,
      createdAt: user.createdAt.toISOString(),
    });
  };

  login = async (req: Request, res: Response): Promise<void> => {
    const result = await this.loginUser.execute(req.body as never);
    res.status(200).json(result);
  };

  loginWeb = async (req: Request, res: Response): Promise<void> => {
    const redirect = readRedirect(req.body);
    try {
      const result = await this.loginUser.execute({
        email: readFormField(req.body, "email"),
        password: readFormField(req.body, "password"),
      });
      AuthMiddleware.setAuthCookie(res, result.accessToken);
      res.redirect(redirect);
    } catch (err) {
      const message =
        err instanceof UnauthorizedException
          ? "Credenciais inválidas"
          : "Erro ao fazer login";
      res.redirect(
        `/login?error=${encodeURIComponent(message)}&redirect=${encodeURIComponent(redirect)}`,
      );
    }
  };

  logoutWeb = (_req: Request, res: Response): void => {
    AuthMiddleware.clearAuthCookie(res);
    res.redirect("/login");
  };
}
