import {
  DrizzleUserRepository,
  DrizzleVideoJobRepository,
} from "@adapter/infra/repository/DrizzleRepositories";
import { createObjectStorage } from "@adapter/infra/storage/storageFactory";
import { VideoProcessingRequestedEnvelopeBuilder } from "@adapter/infra/messaging/builders/VideoProcessingRequestedEnvelopeBuilder";
import type { RepositoryContext } from "./types";

export function initializeRepositories(): RepositoryContext {
  return {
    users: new DrizzleUserRepository(),
    videoJobs: new DrizzleVideoJobRepository(),
    storage: createObjectStorage(),
    events: new VideoProcessingRequestedEnvelopeBuilder(),
  };
}
