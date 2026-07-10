import express, { type Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { Registry } from 'prom-client';
import cron from 'node-cron';
import { ValidationService } from '@application/services/ValidationService';
import { ExpressValidationErrorHandler } from '@adapter/infra/services/ExpressValidationErrorHandler';
import { RegisterUserUseCase } from '@use-cases/auth/RegisterUserUseCase';
import { LoginUserUseCase } from '@use-cases/auth/LoginUserUseCase';
import { SubmitVideoUseCase } from '@use-cases/videoJob/SubmitVideoUseCase';
import { ListUserVideosUseCase } from '@use-cases/videoJob/ListUserVideosUseCase';
import { GetVideoJobUseCase } from '@use-cases/videoJob/GetVideoJobUseCase';
import { DownloadVideoZipUseCase } from '@use-cases/videoJob/DownloadVideoZipUseCase';
import { ApplyVideoProcessingCompletedUseCase } from '@use-cases/videoJob/ApplyVideoProcessingCompletedUseCase';
import { ApplyVideoProcessingFailedUseCase } from '@use-cases/videoJob/ApplyVideoProcessingFailedUseCase';
import {
  DrizzleUserRepository,
  DrizzleVideoJobRepository,
} from '@adapter/infra/repository/DrizzleRepositories';
import { LocalObjectStorage } from '@adapter/infra/storage/LocalObjectStorage';
import { VideoProcessingRequestedEnvelopeBuilder } from '@adapter/infra/messaging/builders/VideoProcessingRequestedEnvelopeBuilder';
import {
  ConsoleLoggerService,
  PrometheusMetricsService,
} from '@adapter/infra/services/ConsoleLoggerService';
import { RedisCacheAdapter } from '@adapter/infra/services/RedisCacheAdapter';
import { BcryptPasswordHasher, JwtTokenService } from '@adapter/infra/auth/AuthAdapters';
import { AmqpConnection } from '@adapter/infra/messaging/amqp/AmqpConnection';
import { AmqpPublisher } from '@adapter/infra/messaging/amqp/AmqpPublisher';
import { OutboxRelayWorker } from '@adapter/infra/messaging/outbox/OutboxRelayWorker';
import { Inbox } from '@adapter/infra/messaging/inbox/Inbox';
import { VideoProcessingCompletedSubscriber } from '@adapter/infra/messaging/subscribers/VideoProcessingCompletedSubscriber';
import { VideoProcessingFailedSubscriber } from '@adapter/infra/messaging/subscribers/VideoProcessingFailedSubscriber';
import { SagaMetricsService } from '@adapter/infra/observability/SagaMetricsService';
import { setupSwagger } from './swagger/setup';
import { AuthController } from '@adapter/driver/controllers/AuthController';
import { VideoController } from '@adapter/driver/controllers/VideoController';
import { buildAuthRoutes } from '@adapter/driver/routes/auth.routes';
import { buildVideoRoutes } from '@adapter/driver/routes/videos.routes';
import { correlationMiddleware } from './middleware/correlation.middleware';
import { createAuthMiddleware } from './middleware/auth.middleware';
import {
  createMetricsMiddleware,
  metricsHandler,
  registerHttpMetrics,
} from './middleware/metrics.middleware';
import { errorHandler } from './error-handler';
import { checkDatabaseConnectivity } from '@adapter/infra/database/client';

export type AppContext = {
  app: Express;
  amqp: AmqpConnection;
  cache: RedisCacheAdapter;
  completedSubscriber: VideoProcessingCompletedSubscriber;
  failedSubscriber: VideoProcessingFailedSubscriber;
};

export function buildApp(): AppContext {
  const logger = new ConsoleLoggerService('app-fiap-videos-api');
  const registry = new Registry();
  const httpMetrics = registerHttpMetrics(registry);
  const sagaMetrics = new SagaMetricsService(registry);
  const metrics = new PrometheusMetricsService(registry);
  const validation = new ValidationService(new ExpressValidationErrorHandler());

  const users = new DrizzleUserRepository();
  const videoJobs = new DrizzleVideoJobRepository();
  const storagePath = process.env.STORAGE_PATH?.trim() || './storage';
  const storage = new LocalObjectStorage(storagePath);
  const events = new VideoProcessingRequestedEnvelopeBuilder();

  const jwtSecret = process.env.JWT_SECRET?.trim();
  if (!jwtSecret) {
    throw new Error('JWT_SECRET is required');
  }
  const passwordHasher = new BcryptPasswordHasher();
  const tokens = new JwtTokenService(
    jwtSecret,
    process.env.JWT_EXPIRES_IN?.trim() || '24h',
  );

  const redisUrl = process.env.REDIS_URL?.trim();
  if (!redisUrl) {
    throw new Error('REDIS_URL is required');
  }
  const cache = new RedisCacheAdapter(redisUrl);

  const exchange =
    process.env.VIDEO_EVENTS_EXCHANGE?.trim() || 'fiap-videos.events';
  const dlx =
    process.env.VIDEO_EVENTS_DLX?.trim() || 'fiap-videos.events.dlx';
  const amqp = new AmqpConnection(
    logger,
    exchange,
    dlx,
    process.env.RABBITMQ_CONNECTION_NAME?.trim() || 'api',
  );
  const publisher = new AmqpPublisher(amqp);
  const outboxRelay = new OutboxRelayWorker(publisher, logger, sagaMetrics);
  const inbox = new Inbox(logger, sagaMetrics);

  const registerUser = new RegisterUserUseCase(users, passwordHasher, validation);
  const loginUser = new LoginUserUseCase(
    users,
    passwordHasher,
    tokens,
    validation,
    metrics,
  );
  const submitVideo = new SubmitVideoUseCase(
    users,
    videoJobs,
    storage,
    events,
    validation,
    logger,
    metrics,
  );
  const listVideos = new ListUserVideosUseCase(videoJobs, cache);
  const getVideo = new GetVideoJobUseCase(videoJobs);
  const downloadZip = new DownloadVideoZipUseCase(videoJobs, storage);
  const applyCompleted = new ApplyVideoProcessingCompletedUseCase(
    videoJobs,
    cache,
    logger,
  );
  const applyFailed = new ApplyVideoProcessingFailedUseCase(
    videoJobs,
    cache,
    logger,
  );

  const completedSubscriber = new VideoProcessingCompletedSubscriber(
    amqp,
    inbox,
    logger,
    applyCompleted,
  );
  const failedSubscriber = new VideoProcessingFailedSubscriber(
    amqp,
    inbox,
    logger,
    applyFailed,
  );

  const authController = new AuthController(registerUser, loginUser);
  const videoController = new VideoController(
    submitVideo,
    listVideos,
    getVideo,
    downloadZip,
  );

  const app = express();
  app.use(helmet());
  app.use(cors());
  app.use(express.json());
  app.use(correlationMiddleware);
  app.use(createMetricsMiddleware(registry, httpMetrics));

  app.get('/health/live', (_req, res) => {
    res.status(200).json({ status: 'ok' });
  });
  app.get('/health/ready', (_req, res) => {
    void checkDatabaseConnectivity().then((ok) => {
      res.status(ok ? 200 : 503).json({ database: ok ? 'up' : 'down' });
    });
  });
  app.get('/metrics', (req, res, next) => {
    void metricsHandler(
      req,
      res,
      registry,
      httpMetrics.databaseUp,
      checkDatabaseConnectivity,
    ).catch(next);
  });

  setupSwagger(app);

  app.use('/auth', buildAuthRoutes(authController));
  app.use('/videos', createAuthMiddleware(tokens), buildVideoRoutes(videoController));

  app.use(errorHandler);

  cron.schedule('*/5 * * * * *', () => {
    void outboxRelay.tick();
  });

  return { app, amqp, cache, completedSubscriber, failedSubscriber };
}
