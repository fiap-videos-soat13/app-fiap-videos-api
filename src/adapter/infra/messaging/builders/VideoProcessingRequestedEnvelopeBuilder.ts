import { randomUUID } from 'node:crypto';
import type { VideoJob } from '@domain/entities/VideoJob';
import { VideoProcessingRequestedEventPort } from '@domain/outboundPorts/VideoPorts';
import {
  VideoEventType,
  SCHEMA_VERSION,
  type VideoEventEnvelope,
} from '@validators/VideoEventEnvelopeValidator';

export class VideoProcessingRequestedEnvelopeBuilder extends VideoProcessingRequestedEventPort {
  buildEnvelope(job: VideoJob, userEmail: string): VideoEventEnvelope {
    const now = new Date().toISOString();
    return {
      eventId: randomUUID(),
      correlationId: job.correlationId,
      workflowId: job.correlationId,
      videoJobId: job.id,
      eventType: VideoEventType.VideoProcessingRequested,
      occurredAt: now,
      schemaVersion: SCHEMA_VERSION[VideoEventType.VideoProcessingRequested],
      payload: {
        userId: job.userId,
        userEmail,
        originalFileName: job.originalFileName,
        storageKey: job.storageKey,
      },
    };
  }
}
