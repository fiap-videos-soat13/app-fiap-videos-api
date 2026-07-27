import { VideoJobStatus } from "@domain/enums/VideoJobStatus";
import {
  BusinessRuleException,
  EntityNotFoundException,
} from "@domain/exceptions/ValidationException";
import { VideoJobRepository } from "@domain/repositories/VideoRepositories";
import { ObjectStoragePort } from "@domain/outboundPorts/VideoPorts";

export class DownloadVideoZipUseCase {
  constructor(
    private readonly videoJobs: VideoJobRepository,
    private readonly storage: ObjectStoragePort,
  ) {}

  async execute(
    userId: string,
    jobId: string,
  ): Promise<{ stream: NodeJS.ReadableStream; fileName: string }> {
    const job = await this.videoJobs.findByIdForUser(jobId, userId);
    if (!job) {
      throw new EntityNotFoundException("Job de vídeo não encontrado");
    }

    if (job.status !== VideoJobStatus.Completed || !job.zipStorageKey) {
      throw new BusinessRuleException(
        "Zip ainda não está disponível para download",
      );
    }

    const exists = await this.storage.zipExists(job.zipStorageKey);
    if (!exists) {
      throw new EntityNotFoundException(
        "Arquivo zip não encontrado no storage",
      );
    }

    const stream = await this.storage.getZipStream(job.zipStorageKey);
    const baseName = job.originalFileName.replace(/\.[^.]+$/, "");
    return { stream, fileName: `${baseName}-frames.zip` };
  }
}
