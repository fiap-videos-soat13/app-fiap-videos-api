import { VideoJob } from '@domain/entities/VideoJob';
import type { VideoJobStatus } from '@domain/enums/VideoJobStatus';
import type { videoJobs } from '@adapter/infra/database/schema/videoJobs';

type DbVideoJob = typeof videoJobs.$inferSelect;

export class VideoJobDbAssembler {
  static toDomain(row: DbVideoJob): VideoJob {
    return new VideoJob(
      row.id,
      row.userId,
      row.originalFileName,
      row.storageKey,
      row.status as VideoJobStatus,
      row.zipStorageKey,
      row.errorMessage,
      row.correlationId,
      row.createdAt,
      row.updatedAt,
      row.completedAt,
    );
  }
}
