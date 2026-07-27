import { EntityNotFoundException } from "@domain/exceptions/ValidationException";
import {
  ObjectStoragePort,
  VideoProcessingRequestedEventPort,
} from "@domain/outboundPorts/VideoPorts";
import {
  UserRepository,
  VideoJobRepository,
} from "@domain/repositories/VideoRepositories";
import {
  LoggerService,
  ObservabilityMetricsService,
} from "@domain/services/CoreServices";
import { ValidationService } from "@application/services/ValidationService";
import { VideoUploadInputSchema } from "@validators/VideoUploadValidator";
import { randomUUID } from "node:crypto";
import type { VideoJob } from "@domain/entities/VideoJob";

export type SubmitVideoInput = {
  userId: string;
  originalFileName: string;
  fileBuffer: Buffer;
  mimeType?: string;
};

export class SubmitVideoUseCase {
  constructor(
    private readonly users: UserRepository,
    private readonly videoJobs: VideoJobRepository,
    private readonly storage: ObjectStoragePort,
    private readonly events: VideoProcessingRequestedEventPort,
    private readonly validation: ValidationService,
    private readonly logger: LoggerService,
    private readonly metrics: ObservabilityMetricsService,
  ) {}

  async execute(input: SubmitVideoInput): Promise<VideoJob> {
    this.validation.validate(
      VideoUploadInputSchema,
      {
        originalFileName: input.originalFileName,
        fileSizeBytes: input.fileBuffer.length,
        mimeType: input.mimeType,
      },
      "SubmitVideo",
    );

    const user = await this.users.findById(input.userId);
    if (!user) {
      throw new EntityNotFoundException("Usuário não encontrado");
    }

    const jobId = randomUUID();
    const correlationId = randomUUID();
    const storageKey = await this.storage.saveUploadedVideo(
      jobId,
      input.fileBuffer,
      input.originalFileName,
    );

    const job = await this.videoJobs.createJob(
      {
        userId: user.id,
        originalFileName: input.originalFileName,
        storageKey,
        correlationId,
      },
      async (created, emit) => {
        const envelope = this.events.buildEnvelope(created, user.email);
        await emit(envelope);
      },
    );

    this.metrics.recordVideoSubmitted();
    this.logger.log("Vídeo enviado para processamento", {
      videoJobId: job.id,
      userId: user.id,
    });

    return job;
  }
}
