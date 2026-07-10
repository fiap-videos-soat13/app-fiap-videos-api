import type { VideoJob } from '@domain/entities/VideoJob';
import type { VideoEventEnvelope } from '@validators/VideoEventEnvelopeValidator';

export abstract class VideoProcessingRequestedEventPort {
  abstract buildEnvelope(
    job: VideoJob,
    userEmail: string,
  ): VideoEventEnvelope;
}

export abstract class ObjectStoragePort {
  abstract saveUploadedVideo(
    jobId: string,
    buffer: Buffer,
    originalFileName: string,
  ): Promise<string>;

  abstract getZipStream(zipStorageKey: string): NodeJS.ReadableStream;

  abstract zipExists(zipStorageKey: string): Promise<boolean>;
}
