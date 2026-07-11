import { Router } from 'express';
import type { AuthController } from '../controllers/AuthController';
import type { AuthMiddleware } from '@adapter/infra/http/middleware/auth.middleware';

export function buildAuthRoutes(
  controller: AuthController,
  auth: AuthMiddleware,
): Router {
  const router = Router();
  router.post(
    '/register',
    auth.requireAdmin,
    controller.register,
  );
  router.post('/login', controller.login);
  router.post('/login/web', controller.loginWeb);
  router.post('/logout/web', controller.logoutWeb);
  return router;
}
