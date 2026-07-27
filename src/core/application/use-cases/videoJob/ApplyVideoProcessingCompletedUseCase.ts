import { EntityNotFoundException } from "@domain/exceptions/ValidationException";
import { VideoJobRepository } from "@domain/repositories/VideoRepositories";
import { CachePort } from "@domain/services/CoreServices";
import { LoggerService } from "@domain/services/CoreServices";

export class ApplyVideoProcessingCompletedUseCase {
  constructor(
    private readonly videoJobs: VideoJobRepository,
    private readonly cache: CachePort,
    private readonly logger: LoggerService,
  ) {}

  async execute(input: {
    videoJobId: string;
    userId: string;
    zipStorageKey: string;
  }): Promise<void> {
    const updated = await this.videoJobs.markCompleted(
      input.videoJobId,
      input.zipStorageKey,
    );
    if (!updated) {
      throw new EntityNotFoundException(
        `Job ${input.videoJobId} não encontrado na API`,
      );
    }
    await this.cache.delete(`videos:list:${input.userId}`);
    this.logger.log("Status sincronizado: completed", {
      videoJobId: input.videoJobId,
    });
  }
}
