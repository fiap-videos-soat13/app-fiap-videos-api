import type { VideoJobStatus } from "@domain/enums/VideoJobStatus";

export class VideoJob {
  constructor(
    public readonly id: string,
    public readonly userId: string,
    public readonly originalFileName: string,
    public readonly storageKey: string,
    public status: VideoJobStatus,
    public zipStorageKey: string | null,
    public errorMessage: string | null,
    public readonly correlationId: string,
    public readonly createdAt: Date,
    public updatedAt: Date,
    public completedAt: Date | null,
  ) {}
}
