import { ListUserVideosUseCase } from "@use-cases/videoJob/ListUserVideosUseCase";
import { VideoJob } from "@domain/entities/VideoJob";
import { VideoJobStatus } from "@domain/enums/VideoJobStatus";
import type { VideoJobRepository } from "@domain/repositories/VideoRepositories";
import type { CachePort } from "@domain/services/CoreServices";

function makeJob(id: string): VideoJob {
  const now = new Date("2026-01-15T10:00:00.000Z");
  return new VideoJob(
    id,
    "user-id",
    `${id}.mp4`,
    `storage/${id}.mp4`,
    VideoJobStatus.Pending,
    null,
    null,
    `corr-${id}`,
    now,
    now,
    null,
  );
}

describe("ListUserVideosUseCase", () => {
  let videoJobs: jest.Mocked<VideoJobRepository>;
  let cache: jest.Mocked<CachePort>;
  let useCase: ListUserVideosUseCase;

  beforeEach(() => {
    videoJobs = {
      createJob: jest.fn(),
      findByIdForUser: jest.fn(),
      listByUserId: jest.fn(),
      markProcessing: jest.fn(),
      markCompleted: jest.fn(),
      markFailed: jest.fn(),
    };
    cache = {
      getJson: jest.fn(),
      setJson: jest.fn(),
      delete: jest.fn(),
    };
    useCase = new ListUserVideosUseCase(videoJobs, cache);
  });

  it("returns cached jobs on cache hit", async () => {
    const job = makeJob("job-1");
    cache.getJson.mockResolvedValue([
      {
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
        completedAt: null,
      },
    ]);

    const result = await useCase.execute("user-id");

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("job-1");
    expect(videoJobs.listByUserId).not.toHaveBeenCalled();
    expect(cache.setJson).not.toHaveBeenCalled();
  });

  it("loads from repository and caches on cache miss", async () => {
    cache.getJson.mockResolvedValue(null);
    const jobs = [makeJob("job-1"), makeJob("job-2")];
    videoJobs.listByUserId.mockResolvedValue(jobs);

    const result = await useCase.execute("user-id");

    expect(result).toEqual(jobs);
    expect(videoJobs.listByUserId).toHaveBeenCalledWith("user-id");
    expect(cache.setJson).toHaveBeenCalledWith(
      "videos:list:user-id",
      expect.any(Array),
      30,
    );
  });
});
