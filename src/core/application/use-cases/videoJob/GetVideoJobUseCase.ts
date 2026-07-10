import { EntityNotFoundException } from '@domain/exceptions/ValidationException';
import { VideoJobRepository } from '@domain/repositories/VideoRepositories';
import type { VideoJob } from '@domain/entities/VideoJob';

export class GetVideoJobUseCase {
  constructor(private readonly videoJobs: VideoJobRepository) {}

  async execute(userId: string, jobId: string): Promise<VideoJob> {
    const job = await this.videoJobs.findByIdForUser(jobId, userId);
    if (!job) {
      throw new EntityNotFoundException('Vídeo não encontrado');
    }
    return job;
  }
}
