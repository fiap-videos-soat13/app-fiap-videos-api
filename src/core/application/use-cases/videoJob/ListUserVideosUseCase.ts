import { VideoJobRepository } from '@domain/repositories/VideoRepositories';
import { CachePort } from '@domain/services/CoreServices';
import type { VideoJob } from '@domain/entities/VideoJob';
import { VideoJobDbAssembler } from '@adapter/infra/repository/assemblers/VideoJobDbAssembler';
import type { videoJobs } from '@adapter/infra/database/schema/videoJobs';

const CACHE_TTL_SECONDS = 30;

type CachedVideoJobRow = {
  id: string;
  userId: string;
  originalFileName: string;
  storageKey: string;
  zipStorageKey: string | null;
  status: string;
  errorMessage: string | null;
  correlationId: string;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
};

function toCacheRow(job: VideoJob): CachedVideoJobRow {
  return {
    id: job.id,
    userId: job.userId,
    originalFileName: job.originalFileName,
    storageKey: job.storageKey,
    zipStorageKey: job.zipStorageKey,
    status: job.status,
    errorMessage: job.errorMessage,
    correlationId: job.correlationId,
    createdAt: job.createdAt.toISOString(),
    updatedAt: job.updatedAt.toISOString(),
    completedAt: job.completedAt?.toISOString() ?? null,
  };
}

function fromCacheRow(row: CachedVideoJobRow): VideoJob {
  const dbRow: typeof videoJobs.$inferSelect = {
    id: row.id,
    userId: row.userId,
    originalFileName: row.originalFileName,
    storageKey: row.storageKey,
    zipStorageKey: row.zipStorageKey,
    status: row.status,
    errorMessage: row.errorMessage,
    correlationId: row.correlationId,
    createdAt: new Date(row.createdAt),
    updatedAt: new Date(row.updatedAt),
    completedAt: row.completedAt ? new Date(row.completedAt) : null,
  };
  return VideoJobDbAssembler.toDomain(dbRow);
}

export class ListUserVideosUseCase {
  constructor(
    private readonly videoJobs: VideoJobRepository,
    private readonly cache: CachePort,
  ) {}

  async execute(userId: string): Promise<VideoJob[]> {
    const cacheKey = `videos:list:${userId}`;
    const cached = await this.cache.getJson<CachedVideoJobRow[]>(cacheKey);
    if (cached) {
      return cached.map((row) => fromCacheRow(row));
    }

    const jobs = await this.videoJobs.listByUserId(userId);
    await this.cache.setJson(
      cacheKey,
      jobs.map((job) => toCacheRow(job)),
      CACHE_TTL_SECONDS,
    );
    return jobs;
  }
}
