import { SubmitVideoUseCase } from "@use-cases/videoJob/SubmitVideoUseCase";
import { EntityNotFoundException } from "@domain/exceptions/ValidationException";
import { UserRole } from "@domain/enums/UserRole";
import { User } from "@domain/entities/User";
import { VideoJob } from "@domain/entities/VideoJob";
import { VideoJobStatus } from "@domain/enums/VideoJobStatus";
import type {
  OnVideoJobCreatedHook,
  UserRepository,
  VideoJobRepository,
} from "@domain/repositories/VideoRepositories";
import type {
  ObjectStoragePort,
  VideoProcessingRequestedEventPort,
} from "@domain/outboundPorts/VideoPorts";
import type {
  LoggerService,
  ObservabilityMetricsService,
} from "@domain/services/CoreServices";
import type { ValidationService } from "@application/services/ValidationService";

describe("SubmitVideoUseCase", () => {
  const user = new User(
    "user-id",
    "user@fiap.com",
    "hash",
    UserRole.User,
    new Date(),
  );

  const job = new VideoJob(
    "job-id",
    "user-id",
    "clip.mp4",
    "storage/clip.mp4",
    VideoJobStatus.Pending,
    null,
    null,
    "corr-id",
    new Date(),
    new Date(),
    null,
  );

  let users: jest.Mocked<UserRepository>;
  let videoJobs: jest.Mocked<VideoJobRepository>;
  let storage: jest.Mocked<ObjectStoragePort>;
  let events: jest.Mocked<VideoProcessingRequestedEventPort>;
  let validation: ValidationService;
  let logger: jest.Mocked<LoggerService>;
  let recordVideoSubmitted: jest.Mock;
  let useCase: SubmitVideoUseCase;

  beforeEach(() => {
    users = {
      findByEmail: jest.fn(),
      findById: jest.fn().mockResolvedValue(user),
      create: jest.fn(),
    };
    videoJobs = {
      createJob: jest
        .fn()
        .mockImplementation(
          async (_input: unknown, onCreated: OnVideoJobCreatedHook) => {
            await onCreated(job, jest.fn());
            return job;
          },
        ),
      findByIdForUser: jest.fn(),
      listByUserId: jest.fn(),
      markProcessing: jest.fn(),
      markCompleted: jest.fn(),
      markFailed: jest.fn(),
    };
    storage = {
      saveUploadedVideo: jest.fn().mockResolvedValue("storage/clip.mp4"),
      zipExists: jest.fn(),
      getZipStream: jest.fn(),
    };
    events = {
      buildEnvelope: jest
        .fn()
        .mockReturnValue({ type: "VideoProcessingRequested" }),
    };
    logger = { log: jest.fn(), error: jest.fn(), warn: jest.fn() };
    recordVideoSubmitted = jest.fn();
    const metrics: ObservabilityMetricsService = {
      recordVideoSubmitted,
      recordAuthLogin: jest.fn(),
    };
    validation = {
      validate: jest.fn((_schema, data: unknown) => data),
    } as unknown as ValidationService;

    useCase = new SubmitVideoUseCase(
      users,
      videoJobs,
      storage,
      events,
      validation,
      logger,
      metrics,
    );
  });

  it("creates job and stores video when user exists", async () => {
    const buffer = Buffer.from("video-bytes");

    const result = await useCase.execute({
      userId: "user-id",
      originalFileName: "clip.mp4",
      fileBuffer: buffer,
      mimeType: "video/mp4",
    });

    expect(result).toBe(job);
    expect(storage.saveUploadedVideo).toHaveBeenCalledWith(
      expect.any(String),
      buffer,
      "clip.mp4",
    );
    expect(videoJobs.createJob).toHaveBeenCalled();
    expect(events.buildEnvelope).toHaveBeenCalledWith(job, user.email);
    expect(recordVideoSubmitted).toHaveBeenCalled();
  });

  it("throws EntityNotFoundException when user does not exist", async () => {
    users.findById.mockResolvedValue(null);

    await expect(
      useCase.execute({
        userId: "missing",
        originalFileName: "clip.mp4",
        fileBuffer: Buffer.from("x"),
      }),
    ).rejects.toBeInstanceOf(EntityNotFoundException);

    expect(storage.saveUploadedVideo).not.toHaveBeenCalled();
    expect(videoJobs.createJob).not.toHaveBeenCalled();
  });
});
