import type { User } from '@domain/entities/User';
import type { UserRole } from '@domain/enums/UserRole';
import type { VideoJob } from '@domain/entities/VideoJob';
import type { VideoEventEnvelope } from '@validators/VideoEventEnvelopeValidator';

export type OnVideoJobCreatedHook = (
  job: VideoJob,
  emit: (envelope: VideoEventEnvelope) => Promise<void>,
) => Promise<void>;

export abstract class UserRepository {
  abstract findByEmail(email: string): Promise<User | null>;
  abstract findById(id: string): Promise<User | null>;
  abstract create(
    email: string,
    passwordHash: string,
    role?: UserRole,
  ): Promise<User>;
}

export abstract class VideoJobRepository {
  abstract createJob(
    input: {
      userId: string;
      originalFileName: string;
      storageKey: string;
      correlationId: string;
    },
    onCreated?: OnVideoJobCreatedHook,
  ): Promise<VideoJob>;

  abstract findByIdForUser(
    jobId: string,
    userId: string,
  ): Promise<VideoJob | null>;

  abstract listByUserId(userId: string): Promise<VideoJob[]>;

  abstract markCompleted(
    jobId: string,
    zipStorageKey: string,
  ): Promise<VideoJob | null>;

  abstract markFailed(
    jobId: string,
    errorMessage: string,
  ): Promise<VideoJob | null>;

  abstract markProcessing(jobId: string): Promise<VideoJob | null>;
}
