import { Registry } from "prom-client";
import { ValidationService } from "@application/services/ValidationService";
import { ExpressValidationErrorHandler } from "@adapter/infra/services/ExpressValidationErrorHandler";
import { createLogger } from "@adapter/infra/logging/loggerFactory";
import { PrometheusMetricsService } from "@adapter/infra/observability/PrometheusMetricsService";
import { SagaMetricsService } from "@adapter/infra/observability/SagaMetricsService";
import { RedisCacheAdapter } from "@adapter/infra/services/RedisCacheAdapter";
import {
  BcryptPasswordHasher,
  JwtTokenService,
} from "@adapter/infra/auth/AuthAdapters";
import { registerHttpMetrics } from "../middleware/metrics.middleware";
import type { InfrastructureContext } from "./types";

export function initializeInfrastructure(): InfrastructureContext {
  const logger = createLogger("app-fiap-videos-api");
  const registry = new Registry();
  const httpMetrics = registerHttpMetrics(registry);
  const sagaMetrics = new SagaMetricsService(registry);
  const metrics = new PrometheusMetricsService(registry);
  const validation = new ValidationService(new ExpressValidationErrorHandler());

  const jwtSecret = process.env.JWT_SECRET?.trim();
  if (!jwtSecret) {
    throw new Error("JWT_SECRET is required");
  }
  const passwordHasher = new BcryptPasswordHasher();
  const tokens = new JwtTokenService(
    jwtSecret,
    process.env.JWT_EXPIRES_IN?.trim() || "24h",
  );

  const redisUrl = process.env.REDIS_URL?.trim();
  if (!redisUrl) {
    throw new Error("REDIS_URL is required");
  }
  const cache = new RedisCacheAdapter(redisUrl);

  return {
    logger,
    registry,
    httpMetrics,
    sagaMetrics,
    metrics,
    validation,
    passwordHasher,
    tokens,
    cache,
  };
}
