import { RegisterUserUseCase } from '@use-cases/auth/RegisterUserUseCase';
import { LoginUserUseCase } from '@use-cases/auth/LoginUserUseCase';
import { SubmitVideoUseCase } from '@use-cases/videoJob/SubmitVideoUseCase';
import { ListUserVideosUseCase } from '@use-cases/videoJob/ListUserVideosUseCase';
import { GetVideoJobUseCase } from '@use-cases/videoJob/GetVideoJobUseCase';
import { DownloadVideoZipUseCase } from '@use-cases/videoJob/DownloadVideoZipUseCase';
import { ApplyVideoProcessingCompletedUseCase } from '@use-cases/videoJob/ApplyVideoProcessingCompletedUseCase';
import { ApplyVideoProcessingFailedUseCase } from '@use-cases/videoJob/ApplyVideoProcessingFailedUseCase';
import { ApplyVideoProcessingStartedUseCase } from '@use-cases/videoJob/ApplyVideoProcessingStartedUseCase';
import type { InfrastructureContext, RepositoryContext, UseCaseContext } from './types';

export function initializeUseCases(
  repos: RepositoryContext,
  infra: InfrastructureContext,
): UseCaseContext {
  const registerUser = new RegisterUserUseCase(
    repos.users,
    infra.passwordHasher,
    infra.validation,
  );
  const loginUser = new LoginUserUseCase(
    repos.users,
    infra.passwordHasher,
    infra.tokens,
    infra.validation,
    infra.metrics,
  );
  const submitVideo = new SubmitVideoUseCase(
    repos.users,
    repos.videoJobs,
    repos.storage,
    repos.events,
    infra.validation,
    infra.logger,
    infra.metrics,
  );
  const listVideos = new ListUserVideosUseCase(repos.videoJobs, infra.cache);
  const getVideo = new GetVideoJobUseCase(repos.videoJobs);
  const downloadZip = new DownloadVideoZipUseCase(repos.videoJobs, repos.storage);
  const applyCompleted = new ApplyVideoProcessingCompletedUseCase(
    repos.videoJobs,
    infra.cache,
    infra.logger,
  );
  const applyFailed = new ApplyVideoProcessingFailedUseCase(
    repos.videoJobs,
    infra.cache,
    infra.logger,
  );
  const applyStarted = new ApplyVideoProcessingStartedUseCase(
    repos.videoJobs,
    infra.cache,
    infra.logger,
  );

  return {
    registerUser,
    loginUser,
    submitVideo,
    listVideos,
    getVideo,
    downloadZip,
    applyCompleted,
    applyFailed,
    applyStarted,
  };
}
