import type { CorsOptions } from "cors";

export function resolveCorsOptions(): CorsOptions {
  const raw = process.env.CORS_ORIGINS?.trim();
  if (!raw) {
    return {};
  }

  const origins = raw
    .split(",")
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0);

  if (origins.length === 0) {
    return {};
  }

  return {
    origin: origins,
    credentials: true,
  };
}

export function shouldTrustProxy(): boolean {
  if (process.env.TRUST_PROXY === "true") {
    return true;
  }
  return process.env.NODE_ENV === "production";
}
