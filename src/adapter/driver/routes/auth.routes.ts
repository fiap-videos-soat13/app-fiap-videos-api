import { Router } from 'express';
import type { AuthController } from '../controllers/AuthController';

export function buildAuthRoutes(controller: AuthController): Router {
  const router = Router();
  router.post('/register', controller.register);
  router.post('/login', controller.login);
  return router;
}
