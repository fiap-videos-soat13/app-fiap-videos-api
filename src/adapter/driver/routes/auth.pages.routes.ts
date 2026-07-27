import path from "node:path";
import { Router } from "express";
import type { AuthMiddleware } from "@adapter/infra/http/middleware/auth.middleware";

function resolvePublicDir(): string {
  return process.env.NODE_ENV === "production"
    ? path.join(__dirname, "../../../public")
    : path.join(process.cwd(), "public");
}

export function buildAuthPageRoutes(auth: AuthMiddleware): Router {
  const router = Router();
  const publicDir = resolvePublicDir();

  router.get("/login", auth.redirectIfAuthenticated, (_req, res) => {
    res.sendFile(path.join(publicDir, "login.html"));
  });
  router.get("/status", auth.protectPage, (_req, res) => {
    res.sendFile(path.join(publicDir, "status.html"));
  });
  router.get("/status/:id", auth.protectPage, (_req, res) => {
    res.sendFile(path.join(publicDir, "status.html"));
  });

  return router;
}
