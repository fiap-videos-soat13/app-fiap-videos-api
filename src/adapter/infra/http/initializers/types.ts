import type { Express } from "express";
import type { Registry } from "prom-client";
import type { ValidationService } from "@application/services/ValidationService";
import type { PrometheusMetricsService } from "@adapter/infra/observability/PrometheusMetricsService";
import type { SagaMetricsService } from "@adapter/infra/observability/SagaMetricsService";
import type { RedisCacheAdapter } from "@adapter/infra/services/RedisCacheAdapter";
import type { JwtTokenService } from "@adapter/infra/auth/AuthAdapters";
import type { BcryptPasswordHasher } from "@adapter/infra/auth/AuthAdapters";
import type { AmqpConnection } from "@adapter/infra/messaging/amqp/AmqpConnection";
import type { OutboxRelayWorker } from "@adapter/infra/messaging/outbox/OutboxRelayWorker";
import type { Inbox } from "@adapter/infra/messaging/inbox/Inbox";
import type { VideoProcessingStartedSubscriber } from "@adapter/infra/messaging/subscribers/VideoProcessingStartedSubscriber";
import type { VideoProcessingCompletedSubscriber } from "@adapter/infra/messaging/subscribers/VideoProcessingCompletedSubscriber";
import type { VideoProcessingFailedSubscriber } from "@adapter/infra/messaging/subscribers/VideoProcessingFailedSubscriber";
import type {
  DrizzleUserRepository,
  DrizzleVideoJobRepository,
} from "@adapter/infra/repository/DrizzleRepositories";
import type { VideoProcessingRequestedEnvelopeBuilder } from "@adapter/infra/messaging/builders/VideoProcessingRequestedEnvelopeBuilder";
import type { RegisterUserUseCase } from "@use-cases/auth/RegisterUserUseCase";
import type { LoginUserUseCase } from "@use-cases/auth/LoginUserUseCase";
import type { SubmitVideoUseCase } from "@use-cases/videoJob/SubmitVideoUseCase";
import type { ListUserVideosUseCase } from "@use-cases/videoJob/ListUserVideosUseCase";
import type { GetVideoJobUseCase } from "@use-cases/videoJob/GetVideoJobUseCase";
import type { DownloadVideoZipUseCase } from "@use-cases/videoJob/DownloadVideoZipUseCase";
import type { ApplyVideoProcessingCompletedUseCase } from "@use-cases/videoJob/ApplyVideoProcessingCompletedUseCase";
import type { ApplyVideoProcessingFailedUseCase } from "@use-cases/videoJob/ApplyVideoProcessingFailedUseCase";
import type { ApplyVideoProcessingStartedUseCase } from "@use-cases/videoJob/ApplyVideoProcessingStartedUseCase";
import type { AuthController } from "@adapter/driver/controllers/AuthController";
import type { VideoController } from "@adapter/driver/controllers/VideoController";
import type { AuthMiddleware } from "../middleware/auth.middleware";
import type { LoggerPort } from "@domain/outboundPorts/LoggerPort";
import type { ObjectStoragePort } from "@domain/outboundPorts/VideoPorts";
import type { registerHttpMetrics } from "../middleware/metrics.middleware";

export type InfrastructureContext = {
  logger: LoggerPort;
  registry: Registry;
  httpMetrics: ReturnType<typeof registerHttpMetrics>;
  sagaMetrics: SagaMetricsService;
  metrics: PrometheusMetricsService;
  validation: ValidationService;
  passwordHasher: BcryptPasswordHasher;
  tokens: JwtTokenService;
  cache: RedisCacheAdapter;
};

export type RepositoryContext = {
  users: DrizzleUserRepository;
  videoJobs: DrizzleVideoJobRepository;
  storage: ObjectStoragePort;
  events: VideoProcessingRequestedEnvelopeBuilder;
};

export type UseCaseContext = {
  registerUser: RegisterUserUseCase;
  loginUser: LoginUserUseCase;
  submitVideo: SubmitVideoUseCase;
  listVideos: ListUserVideosUseCase;
  getVideo: GetVideoJobUseCase;
  downloadZip: DownloadVideoZipUseCase;
  applyCompleted: ApplyVideoProcessingCompletedUseCase;
  applyFailed: ApplyVideoProcessingFailedUseCase;
  applyStarted: ApplyVideoProcessingStartedUseCase;
};

export type MessagingContext = {
  amqp: AmqpConnection;
  outboxRelay: OutboxRelayWorker;
  inbox: Inbox;
  startedSubscriber: VideoProcessingStartedSubscriber;
  completedSubscriber: VideoProcessingCompletedSubscriber;
  failedSubscriber: VideoProcessingFailedSubscriber;
};

export type ControllerContext = {
  authController: AuthController;
  videoController: VideoController;
  auth: AuthMiddleware;
};

export type AppContext = {
  app: Express;
  amqp: AmqpConnection;
  cache: RedisCacheAdapter;
  startedSubscriber: VideoProcessingStartedSubscriber;
  completedSubscriber: VideoProcessingCompletedSubscriber;
  failedSubscriber: VideoProcessingFailedSubscriber;
};
