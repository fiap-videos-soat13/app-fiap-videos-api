import {
  LoggerService,
  ObservabilityMetricsService,
} from "@domain/services/CoreServices";
import { Counter, Registry, collectDefaultMetrics } from "prom-client";

const APP_NAME =
  process.env.METRICS_SERVICE_NAME?.trim() || "app-fiap-videos-api";

function writeLog(
  level: "info" | "warn" | "error",
  message: string,
  context?: Record<string, string>,
): void {
  const payload = {
    timestamp: new Date().toISOString(),
    level,
    app: APP_NAME,
    message,
    ...context,
  };
  const line = JSON.stringify(payload);
  if (level === "error") {
    console.error(line);
  } else if (level === "warn") {
    console.warn(line);
  } else {
    console.log(line);
  }
}

export class ConsoleLoggerService extends LoggerService {
  constructor(private readonly app = APP_NAME) {
    super();
  }

  log(message: string, context?: Record<string, string>): void {
    writeLog("info", message, { app: this.app, ...context });
  }

  warn(message: string, context?: Record<string, string>): void {
    writeLog("warn", message, { app: this.app, ...context });
  }

  error(message: string, context?: Record<string, string>): void {
    writeLog("error", message, { app: this.app, ...context });
  }
}

export class PrometheusMetricsService extends ObservabilityMetricsService {
  private readonly videosSubmitted: Counter;
  private readonly authLogins: Counter;

  constructor(private readonly registry: Registry) {
    super();
    this.videosSubmitted = new Counter({
      name: "fiap_videos_submitted_total",
      help: "Total de vídeos enviados para processamento",
      registers: [registry],
    });
    this.authLogins = new Counter({
      name: "fiap_videos_auth_login_total",
      help: "Tentativas de login",
      labelNames: ["success"],
      registers: [registry],
    });
    collectDefaultMetrics({ register: registry });
  }

  recordVideoSubmitted(): void {
    this.videosSubmitted.inc();
  }

  recordAuthLogin(success: boolean): void {
    this.authLogins.inc({ success: success ? "true" : "false" });
  }

  getRegistry(): Registry {
    return this.registry;
  }
}
