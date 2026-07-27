import { EntityNotFoundException } from "@domain/exceptions/ValidationException";
import { VideoJobRepository } from "@domain/repositories/VideoRepositories";
import { CachePort, LoggerService } from "@domain/services/CoreServices";

export class ApplyVideoProcessingFailedUseCase {
  constructor(
    private readonly videoJobs: VideoJobRepository,
    private readonly cache: CachePort,
    private readonly logger: LoggerService,
  ) {}

  async execute(input: {
    videoJobId: string;
    userId: string;
    errorMessage: string;
  }): Promise<void> {
    const updated = await this.videoJobs.markFailed(
      input.videoJobId,
      input.errorMessage,
    );
    if (!updated) {
      throw new EntityNotFoundException(
        `Job ${input.videoJobId} não encontrado na API`,
      );
    }
    await this.cache.delete(`videos:list:${input.userId}`);
    this.logger.log("Status sincronizado: failed", {
      videoJobId: input.videoJobId,
    });
  }
}
