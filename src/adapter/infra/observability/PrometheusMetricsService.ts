import { ObservabilityMetricsService } from "@domain/services/CoreServices";
import { Counter, Registry, collectDefaultMetrics } from "prom-client";

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
