import { AmqpConnection } from "@adapter/infra/messaging/amqp/AmqpConnection";
import { AmqpPublisher } from "@adapter/infra/messaging/amqp/AmqpPublisher";
import { OutboxRelayWorker } from "@adapter/infra/messaging/outbox/OutboxRelayWorker";
import { Inbox } from "@adapter/infra/messaging/inbox/Inbox";
import { VideoProcessingCompletedSubscriber } from "@adapter/infra/messaging/subscribers/VideoProcessingCompletedSubscriber";
import { VideoProcessingFailedSubscriber } from "@adapter/infra/messaging/subscribers/VideoProcessingFailedSubscriber";
import { VideoProcessingStartedSubscriber } from "@adapter/infra/messaging/subscribers/VideoProcessingStartedSubscriber";
import type {
  InfrastructureContext,
  UseCaseContext,
  MessagingContext,
} from "./types";

export function initializeMessaging(
  infra: InfrastructureContext,
  useCases: UseCaseContext,
): MessagingContext {
  const exchange =
    process.env.VIDEO_EVENTS_EXCHANGE?.trim() || "fiap-videos.events";
  const dlx = process.env.VIDEO_EVENTS_DLX?.trim() || "fiap-videos.events.dlx";
  const amqp = new AmqpConnection(
    infra.logger,
    exchange,
    dlx,
    process.env.RABBITMQ_CONNECTION_NAME?.trim() || "api",
  );
  const publisher = new AmqpPublisher(amqp);
  const outboxRelay = new OutboxRelayWorker(
    publisher,
    infra.logger,
    infra.sagaMetrics,
  );
  const inbox = new Inbox(infra.logger, infra.sagaMetrics);

  const startedSubscriber = new VideoProcessingStartedSubscriber(
    amqp,
    inbox,
    infra.logger,
    useCases.applyStarted,
  );
  const completedSubscriber = new VideoProcessingCompletedSubscriber(
    amqp,
    inbox,
    infra.logger,
    useCases.applyCompleted,
  );
  const failedSubscriber = new VideoProcessingFailedSubscriber(
    amqp,
    inbox,
    infra.logger,
    useCases.applyFailed,
  );

  return {
    amqp,
    outboxRelay,
    inbox,
    startedSubscriber,
    completedSubscriber,
    failedSubscriber,
  };
}
