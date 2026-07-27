import { AuthController } from "@adapter/driver/controllers/AuthController";
import { VideoController } from "@adapter/driver/controllers/VideoController";
import { AuthMiddleware } from "../middleware/auth.middleware";
import type {
  ControllerContext,
  InfrastructureContext,
  UseCaseContext,
} from "./types";

export function initializeControllers(
  useCases: UseCaseContext,
  infra: InfrastructureContext,
): ControllerContext {
  const auth = AuthMiddleware.initialize(infra.tokens);

  return {
    authController: new AuthController(
      useCases.registerUser,
      useCases.loginUser,
    ),
    videoController: new VideoController(
      useCases.submitVideo,
      useCases.listVideos,
      useCases.getVideo,
      useCases.downloadZip,
    ),
    auth,
  };
}
