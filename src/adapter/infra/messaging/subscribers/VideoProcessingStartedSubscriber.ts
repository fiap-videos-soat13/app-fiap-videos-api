import {
  VideoProcessingStartedPayloadSchema,
  type VideoEventEnvelope,
} from '@validators/VideoEventEnvelopeValidator';
import { AmqpConnection } from '../amqp/AmqpConnection';
import { Inbox } from '../inbox/Inbox';
import { BaseEventSubscriber } from './BaseEventSubscriber';
import { SubscribersConfig } from './subscribersConfig';
import { ApplyVideoProcessingStartedUseCase } from '@use-cases/videoJob/ApplyVideoProcessingStartedUseCase';
import { ConsoleLoggerService } from '@adapter/infra/services/ConsoleLoggerService';
import type { z } from 'zod';

type StartedPayload = z.infer<typeof VideoProcessingStartedPayloadSchema>;

export class VideoProcessingStartedSubscriber extends BaseEventSubscriber<StartedPayload> {
  constructor(
    connection: AmqpConnection,
    inbox: Inbox,
    logger: ConsoleLoggerService,
    private readonly applyStarted: ApplyVideoProcessingStartedUseCase,
  ) {
    super(connection, inbox, logger, {
      consumerName: SubscribersConfig.VideoProcessingStarted.consumerName,
      queueName: SubscribersConfig.VideoProcessingStarted.queueName,
      eventType: SubscribersConfig.VideoProcessingStarted.eventType,
      parsePayload: (payload) =>
        VideoProcessingStartedPayloadSchema.parse(payload),
      onEvent: async (
        envelope: VideoEventEnvelope,
        payload: StartedPayload,
      ) => {
        await applyStarted.execute({
          videoJobId: envelope.videoJobId,
          userId: payload.userId,
        });
      },
    });
  }
}
