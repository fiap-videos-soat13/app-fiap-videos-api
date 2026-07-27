import { ApplyVideoProcessingStartedUseCase } from "@use-cases/videoJob/ApplyVideoProcessingStartedUseCase";
import { ApplyVideoProcessingCompletedUseCase } from "@use-cases/videoJob/ApplyVideoProcessingCompletedUseCase";
import { ApplyVideoProcessingFailedUseCase } from "@use-cases/videoJob/ApplyVideoProcessingFailedUseCase";
import { EntityNotFoundException } from "@domain/exceptions/ValidationException";
import { VideoJob } from "@domain/entities/VideoJob";
import { VideoJobStatus } from "@domain/enums/VideoJobStatus";
import type { VideoJobRepository } from "@domain/repositories/VideoRepositories";
import type { CachePort, LoggerService } from "@domain/services/CoreServices";

function makeJob(): VideoJob {
  const now = new Date();
  return new VideoJob(
    "job-id",
    "user-id",
    "video.mp4",
    "videos/job-id-video.mp4",
    VideoJobStatus.Processing,
    null,
    null,
    "corr-id",
    now,
    now,
    null,
  );
}

describe("ApplyVideoProcessing status use cases", () => {
  let videoJobs: jest.Mocked<VideoJobRepository>;
  let cache: jest.Mocked<CachePort>;
  let logger: jest.Mocked<LoggerService>;

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
    logger = { log: jest.fn(), error: jest.fn(), warn: jest.fn() };
  });

  describe("ApplyVideoProcessingStartedUseCase", () => {
    it("marks job processing and invalidates cache", async () => {
      videoJobs.markProcessing.mockResolvedValue(makeJob());
      const useCase = new ApplyVideoProcessingStartedUseCase(
        videoJobs,
        cache,
        logger,
      );

      await useCase.execute({ videoJobId: "job-id", userId: "user-id" });

      expect(videoJobs.markProcessing).toHaveBeenCalledWith("job-id");
      expect(cache.delete).toHaveBeenCalledWith("videos:list:user-id");
    });

    it("throws when job is not found", async () => {
      videoJobs.markProcessing.mockResolvedValue(null);
      const useCase = new ApplyVideoProcessingStartedUseCase(
        videoJobs,
        cache,
        logger,
      );

      await expect(
        useCase.execute({ videoJobId: "missing", userId: "user-id" }),
      ).rejects.toBeInstanceOf(EntityNotFoundException);
    });
  });

  describe("ApplyVideoProcessingCompletedUseCase", () => {
    it("marks job completed and invalidates cache", async () => {
      videoJobs.markCompleted.mockResolvedValue(makeJob());
      const useCase = new ApplyVideoProcessingCompletedUseCase(
        videoJobs,
        cache,
        logger,
      );

      await useCase.execute({
        videoJobId: "job-id",
        userId: "user-id",
        zipStorageKey: "zips/job.zip",
      });

      expect(videoJobs.markCompleted).toHaveBeenCalledWith(
        "job-id",
        "zips/job.zip",
      );
      expect(cache.delete).toHaveBeenCalledWith("videos:list:user-id");
    });

    it("throws when job is not found", async () => {
      videoJobs.markCompleted.mockResolvedValue(null);
      const useCase = new ApplyVideoProcessingCompletedUseCase(
        videoJobs,
        cache,
        logger,
      );

      await expect(
        useCase.execute({
          videoJobId: "missing",
          userId: "user-id",
          zipStorageKey: "zips/job.zip",
        }),
      ).rejects.toBeInstanceOf(EntityNotFoundException);
    });
  });

  describe("ApplyVideoProcessingFailedUseCase", () => {
    it("marks job failed and invalidates cache", async () => {
      videoJobs.markFailed.mockResolvedValue(makeJob());
      const useCase = new ApplyVideoProcessingFailedUseCase(
        videoJobs,
        cache,
        logger,
      );

      await useCase.execute({
        videoJobId: "job-id",
        userId: "user-id",
        errorMessage: "ffmpeg error",
      });

      expect(videoJobs.markFailed).toHaveBeenCalledWith(
        "job-id",
        "ffmpeg error",
      );
      expect(cache.delete).toHaveBeenCalledWith("videos:list:user-id");
    });

    it("throws when job is not found", async () => {
      videoJobs.markFailed.mockResolvedValue(null);
      const useCase = new ApplyVideoProcessingFailedUseCase(
        videoJobs,
        cache,
        logger,
      );

      await expect(
        useCase.execute({
          videoJobId: "missing",
          userId: "user-id",
          errorMessage: "err",
        }),
      ).rejects.toBeInstanceOf(EntityNotFoundException);
    });
  });
});
