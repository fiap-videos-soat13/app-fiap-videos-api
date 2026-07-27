import express, { type Express } from "express";
import cors from "cors";
import helmet from "helmet";
import { correlationMiddleware } from "../middleware/correlation.middleware";
import { createMetricsMiddleware } from "../middleware/metrics.middleware";
import {
  resolveCorsOptions,
  shouldTrustProxy,
} from "../security/httpSecurityConfig";
import type { InfrastructureContext } from "./types";

export function initializeExpress(infra: InfrastructureContext): Express {
  const app = express();

  if (shouldTrustProxy()) {
    app.set("trust proxy", 1);
  }

  app.use(helmet({ contentSecurityPolicy: false }));
  app.use(cors(resolveCorsOptions()));
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use(correlationMiddleware);
  app.use(createMetricsMiddleware(infra.registry, infra.httpMetrics));

  return app;
}
