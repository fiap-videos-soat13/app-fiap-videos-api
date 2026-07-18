import { DownloadVideoZipUseCase } from '@use-cases/videoJob/DownloadVideoZipUseCase';
import {
  BusinessRuleException,
  EntityNotFoundException,
} from '@domain/exceptions/ValidationException';
import { VideoJob } from '@domain/entities/VideoJob';
import { VideoJobStatus } from '@domain/enums/VideoJobStatus';
import type { VideoJobRepository } from '@domain/repositories/VideoRepositories';
import type { ObjectStoragePort } from '@domain/outboundPorts/VideoPorts';
import { Readable } from 'node:stream';

function makeJob(status: VideoJobStatus, zipKey: string | null): VideoJob {
  const now = new Date();
  return new VideoJob(
    'job-id',
    'user-id',
    'my-video.mp4',
    'storage/my-video.mp4',
    status,
    zipKey,
    null,
    'corr-id',
    now,
    now,
    status === VideoJobStatus.Completed ? now : null,
  );
}

describe('DownloadVideoZipUseCase', () => {
  let videoJobs: jest.Mocked<VideoJobRepository>;
  let storage: jest.Mocked<ObjectStoragePort>;
  let useCase: DownloadVideoZipUseCase;

  beforeEach(() => {
    videoJobs = {
      createJob: jest.fn(),
      findByIdForUser: jest.fn(),
      listByUserId: jest.fn(),
      markProcessing: jest.fn(),
      markCompleted: jest.fn(),
      markFailed: jest.fn(),
    };
    storage = {
      saveUploadedVideo: jest.fn(),
      zipExists: jest.fn(),
      getZipStream: jest.fn(),
    };
    useCase = new DownloadVideoZipUseCase(videoJobs, storage);
  });

  it('throws when job is not found for user', async () => {
    videoJobs.findByIdForUser.mockResolvedValue(null);

    await expect(useCase.execute('user-id', 'job-id')).rejects.toBeInstanceOf(
      EntityNotFoundException,
    );
  });

  it('throws when job is not completed', async () => {
    videoJobs.findByIdForUser.mockResolvedValue(
      makeJob(VideoJobStatus.Processing, null),
    );

    await expect(useCase.execute('user-id', 'job-id')).rejects.toBeInstanceOf(
      BusinessRuleException,
    );
  });

  it('throws when zip file is missing in storage', async () => {
    videoJobs.findByIdForUser.mockResolvedValue(
      makeJob(VideoJobStatus.Completed, 'zips/job.zip'),
    );
    storage.zipExists.mockResolvedValue(false);

    await expect(useCase.execute('user-id', 'job-id')).rejects.toBeInstanceOf(
      EntityNotFoundException,
    );
  });

  it('returns stream and derived file name on happy path', async () => {
    videoJobs.findByIdForUser.mockResolvedValue(
      makeJob(VideoJobStatus.Completed, 'zips/job.zip'),
    );
    storage.zipExists.mockResolvedValue(true);
    const stream = Readable.from(['zip']);
    storage.getZipStream.mockReturnValue(stream);

    const result = await useCase.execute('user-id', 'job-id');

    expect(result.stream).toBe(stream);
    expect(result.fileName).toBe('my-video-frames.zip');
    expect(storage.getZipStream).toHaveBeenCalledWith('zips/job.zip');
  });
});
