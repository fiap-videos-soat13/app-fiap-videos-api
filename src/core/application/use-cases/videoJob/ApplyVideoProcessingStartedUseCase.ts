import { EntityNotFoundException } from '@domain/exceptions/ValidationException';
import { VideoJobRepository } from '@domain/repositories/VideoRepositories';
import { CachePort } from '@domain/services/CoreServices';
import { LoggerService } from '@domain/services/CoreServices';

export class ApplyVideoProcessingStartedUseCase {
  constructor(
    private readonly videoJobs: VideoJobRepository,
    private readonly cache: CachePort,
    private readonly logger: LoggerService,
  ) {}

  async execute(input: {
    videoJobId: string;
    userId: string;
  }): Promise<void> {
    const updated = await this.videoJobs.markProcessing(input.videoJobId);
    if (!updated) {
      throw new EntityNotFoundException(
        `Job ${input.videoJobId} não encontrado na API`,
      );
    }
    await this.cache.delete(`videos:list:${input.userId}`);
    this.logger.log('Status sincronizado: processing', {
      videoJobId: input.videoJobId,
    });
  }
}
