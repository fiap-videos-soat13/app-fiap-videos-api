import type { Express } from "express";
import { buildAuthPageRoutes } from "@adapter/driver/routes/auth.pages.routes";
import { buildAuthRoutes } from "@adapter/driver/routes/auth.routes";
import { buildVideoRoutes } from "@adapter/driver/routes/videos.routes";
import type { ControllerContext } from "./types";

export function initializeDomainRoutes(
  app: Express,
  controllers: ControllerContext,
): void {
  const { authController, videoController, auth } = controllers;

  app.use(buildAuthPageRoutes(auth));
  app.use("/auth", buildAuthRoutes(authController, auth));
  app.use("/videos", auth.authenticateApi, buildVideoRoutes(videoController));
}
