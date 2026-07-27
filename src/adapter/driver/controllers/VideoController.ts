import type { Response } from "express";
import type { AuthenticatedRequest } from "@adapter/infra/http/middleware/correlation.middleware";
import { SubmitVideoUseCase } from "@use-cases/videoJob/SubmitVideoUseCase";
import { ListUserVideosUseCase } from "@use-cases/videoJob/ListUserVideosUseCase";
import { GetVideoJobUseCase } from "@use-cases/videoJob/GetVideoJobUseCase";
import { DownloadVideoZipUseCase } from "@use-cases/videoJob/DownloadVideoZipUseCase";
import { UnauthorizedException } from "@domain/exceptions/ValidationException";

type UploadedFile = {
  originalname: string;
  buffer: Buffer;
  mimetype: string;
};

function collectUploadedFiles(req: AuthenticatedRequest): UploadedFile[] {
  const fromArray = req.files;
  if (Array.isArray(fromArray)) {
    return fromArray;
  }

  if (fromArray && typeof fromArray === "object") {
    const fieldFiles = fromArray as Record<string, UploadedFile[]>;
    const videos = fieldFiles.videos ?? [];
    const single = fieldFiles.video ?? [];
    return [...single, ...videos];
  }

  if (req.file) {
    return [req.file];
  }

  return [];
}

export class VideoController {
  constructor(
    private readonly submitVideo: SubmitVideoUseCase,
    private readonly listVideos: ListUserVideosUseCase,
    private readonly getVideo: GetVideoJobUseCase,
    private readonly downloadZip: DownloadVideoZipUseCase,
  ) {}

  submit = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const userId = req.userId;
    if (!userId) {
      throw new UnauthorizedException();
    }

    const files = collectUploadedFiles(req);
    if (files.length === 0) {
      res.status(400).json({
        error: "FILE_REQUIRED",
        message: "Arquivo de vídeo obrigatório",
      });
      return;
    }

    const jobs = await Promise.all(
      files.map((file) =>
        this.submitVideo.execute({
          userId,
          originalFileName: file.originalname,
          fileBuffer: file.buffer,
          mimeType: file.mimetype,
        }),
      ),
    );

    if (jobs.length === 1) {
      const job = jobs[0];
      res.status(202).json({
        id: job.id,
        status: job.status,
        originalFileName: job.originalFileName,
        createdAt: job.createdAt.toISOString(),
      });
      return;
    }

    res.status(202).json(
      jobs.map((job) => ({
        id: job.id,
        status: job.status,
        originalFileName: job.originalFileName,
        createdAt: job.createdAt.toISOString(),
      })),
    );
  };

  list = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const userId = req.userId;
    if (!userId) {
      throw new UnauthorizedException();
    }

    const jobs = await this.listVideos.execute(userId);
    res.status(200).json(
      jobs.map((job) => ({
        id: job.id,
        status: job.status,
        originalFileName: job.originalFileName,
        errorMessage: job.errorMessage,
        createdAt: job.createdAt.toISOString(),
        updatedAt: job.updatedAt.toISOString(),
        completedAt: job.completedAt?.toISOString() ?? null,
      })),
    );
  };

  getById = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const userId = req.userId;
    if (!userId) {
      throw new UnauthorizedException();
    }

    const jobId = String(req.params.id ?? "");
    const job = await this.getVideo.execute(userId, jobId);
    res.status(200).json({
      id: job.id,
      status: job.status,
      originalFileName: job.originalFileName,
      errorMessage: job.errorMessage,
      createdAt: job.createdAt.toISOString(),
      updatedAt: job.updatedAt.toISOString(),
      completedAt: job.completedAt?.toISOString() ?? null,
    });
  };

  download = async (
    req: AuthenticatedRequest,
    res: Response,
  ): Promise<void> => {
    const userId = req.userId;
    if (!userId) {
      throw new UnauthorizedException();
    }

    const jobId = String(req.params.id ?? "");
    if (!jobId) {
      res.status(400).json({ error: "INVALID_ID" });
      return;
    }

    const { stream, fileName } = await this.downloadZip.execute(userId, jobId);
    res.setHeader("Content-Type", "application/zip");
    res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);
    stream.pipe(res);
  };
}
