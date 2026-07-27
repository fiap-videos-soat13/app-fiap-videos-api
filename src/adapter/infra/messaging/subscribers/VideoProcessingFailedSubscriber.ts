import {
  VideoProcessingFailedPayloadSchema,
  type VideoEventEnvelope,
} from '@validators/VideoEventEnvelopeValidator';
import { AmqpConnection } from '../amqp/AmqpConnection';
import { Inbox } from '../inbox/Inbox';
import { BaseEventSubscriber } from './BaseEventSubscriber';
import { SubscribersConfig } from './subscribersConfig';
import { ApplyVideoProcessingFailedUseCase } from '@use-cases/videoJob/ApplyVideoProcessingFailedUseCase';
import type { LoggerPort } from '@domain/outboundPorts/LoggerPort';
import type { z } from 'zod';

type FailedPayload = z.infer<typeof VideoProcessingFailedPayloadSchema>;

export class VideoProcessingFailedSubscriber extends BaseEventSubscriber<FailedPayload> {
  constructor(
    connection: AmqpConnection,
    inbox: Inbox,
    logger: LoggerPort,
    private readonly applyFailed: ApplyVideoProcessingFailedUseCase,
  ) {
    super(connection, inbox, logger, {
      consumerName: SubscribersConfig.VideoProcessingFailed.consumerName,
      queueName: SubscribersConfig.VideoProcessingFailed.queueName,
      eventType: SubscribersConfig.VideoProcessingFailed.eventType,
      parsePayload: (payload) =>
        VideoProcessingFailedPayloadSchema.parse(payload),
      onEvent: async (
        envelope: VideoEventEnvelope,
        payload: FailedPayload,
      ) => {
        await applyFailed.execute({
          videoJobId: envelope.videoJobId,
          userId: payload.userId,
          errorMessage: payload.errorMessage,
        });
      },
    });
  }
}
