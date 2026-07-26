import { Router } from 'express';
import type { AuthController } from '../controllers/AuthController';
import type { AuthMiddleware } from '@adapter/infra/http/middleware/auth.middleware';
import { createLoginRateLimiter } from '@adapter/infra/http/middleware/loginRateLimit.middleware';

export function buildAuthRoutes(
  controller: AuthController,
  auth: AuthMiddleware,
): Router {
  const router = Router();
  const loginRateLimit = createLoginRateLimiter();

  router.post(
    '/register',
    auth.requireAdmin,
    controller.register,
  );
  router.post('/login', loginRateLimit, controller.login);
  router.post('/login/web', loginRateLimit, controller.loginWeb);
  router.post('/logout/web', controller.logoutWeb);
  return router;
}
