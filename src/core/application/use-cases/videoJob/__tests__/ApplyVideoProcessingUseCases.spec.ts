import { ApplyVideoProcessingStartedUseCase } from '@use-cases/videoJob/ApplyVideoProcessingStartedUseCase';
import { ApplyVideoProcessingCompletedUseCase } from '@use-cases/videoJob/ApplyVideoProcessingCompletedUseCase';
import { ApplyVideoProcessingFailedUseCase } from '@use-cases/videoJob/ApplyVideoProcessingFailedUseCase';
import { EntityNotFoundException } from '@domain/exceptions/ValidationException';
import type { VideoJobRepository } from '@domain/repositories/VideoRepositories';
import type { CachePort, LoggerService } from '@domain/services/CoreServices';

describe('ApplyVideoProcessing status use cases', () => {
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

  describe('ApplyVideoProcessingStartedUseCase', () => {
    it('marks job processing and invalidates cache', async () => {
      videoJobs.markProcessing.mockResolvedValue(true);
      const useCase = new ApplyVideoProcessingStartedUseCase(
        videoJobs,
        cache,
        logger,
      );

      await useCase.execute({ videoJobId: 'job-id', userId: 'user-id' });

      expect(videoJobs.markProcessing).toHaveBeenCalledWith('job-id');
      expect(cache.delete).toHaveBeenCalledWith('videos:list:user-id');
    });

    it('throws when job is not found', async () => {
      videoJobs.markProcessing.mockResolvedValue(false);
      const useCase = new ApplyVideoProcessingStartedUseCase(
        videoJobs,
        cache,
        logger,
      );

      await expect(
        useCase.execute({ videoJobId: 'missing', userId: 'user-id' }),
      ).rejects.toBeInstanceOf(EntityNotFoundException);
    });
  });

  describe('ApplyVideoProcessingCompletedUseCase', () => {
    it('marks job completed and invalidates cache', async () => {
      videoJobs.markCompleted.mockResolvedValue(true);
      const useCase = new ApplyVideoProcessingCompletedUseCase(
        videoJobs,
        cache,
        logger,
      );

      await useCase.execute({
        videoJobId: 'job-id',
        userId: 'user-id',
        zipStorageKey: 'zips/job.zip',
      });

      expect(videoJobs.markCompleted).toHaveBeenCalledWith(
        'job-id',
        'zips/job.zip',
      );
      expect(cache.delete).toHaveBeenCalledWith('videos:list:user-id');
    });

    it('throws when job is not found', async () => {
      videoJobs.markCompleted.mockResolvedValue(false);
      const useCase = new ApplyVideoProcessingCompletedUseCase(
        videoJobs,
        cache,
        logger,
      );

      await expect(
        useCase.execute({
          videoJobId: 'missing',
          userId: 'user-id',
          zipStorageKey: 'zips/job.zip',
        }),
      ).rejects.toBeInstanceOf(EntityNotFoundException);
    });
  });

  describe('ApplyVideoProcessingFailedUseCase', () => {
    it('marks job failed and invalidates cache', async () => {
      videoJobs.markFailed.mockResolvedValue(true);
      const useCase = new ApplyVideoProcessingFailedUseCase(
        videoJobs,
        cache,
        logger,
      );

      await useCase.execute({
        videoJobId: 'job-id',
        userId: 'user-id',
        errorMessage: 'ffmpeg error',
      });

      expect(videoJobs.markFailed).toHaveBeenCalledWith(
        'job-id',
        'ffmpeg error',
      );
      expect(cache.delete).toHaveBeenCalledWith('videos:list:user-id');
    });

    it('throws when job is not found', async () => {
      videoJobs.markFailed.mockResolvedValue(false);
      const useCase = new ApplyVideoProcessingFailedUseCase(
        videoJobs,
        cache,
        logger,
      );

      await expect(
        useCase.execute({
          videoJobId: 'missing',
          userId: 'user-id',
          errorMessage: 'err',
        }),
      ).rejects.toBeInstanceOf(EntityNotFoundException);
    });
  });
});
