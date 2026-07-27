import {
  VideoProcessingCompletedPayloadSchema,
  type VideoEventEnvelope,
} from '@validators/VideoEventEnvelopeValidator';
import { AmqpConnection } from '../amqp/AmqpConnection';
import { Inbox } from '../inbox/Inbox';
import { BaseEventSubscriber } from './BaseEventSubscriber';
import { SubscribersConfig } from './subscribersConfig';
import { ApplyVideoProcessingCompletedUseCase } from '@use-cases/videoJob/ApplyVideoProcessingCompletedUseCase';
import type { LoggerPort } from '@domain/outboundPorts/LoggerPort';
import type { z } from 'zod';

type CompletedPayload = z.infer<typeof VideoProcessingCompletedPayloadSchema>;

export class VideoProcessingCompletedSubscriber extends BaseEventSubscriber<CompletedPayload> {
  constructor(
    connection: AmqpConnection,
    inbox: Inbox,
    logger: LoggerPort,
    private readonly applyCompleted: ApplyVideoProcessingCompletedUseCase,
  ) {
    super(connection, inbox, logger, {
      consumerName: SubscribersConfig.VideoProcessingCompleted.consumerName,
      queueName: SubscribersConfig.VideoProcessingCompleted.queueName,
      eventType: SubscribersConfig.VideoProcessingCompleted.eventType,
      parsePayload: (payload) =>
        VideoProcessingCompletedPayloadSchema.parse(payload),
      onEvent: async (
        envelope: VideoEventEnvelope,
        payload: CompletedPayload,
      ) => {
        await applyCompleted.execute({
          videoJobId: envelope.videoJobId,
          userId: payload.userId,
          zipStorageKey: payload.zipStorageKey,
        });
      },
    });
  }
}
