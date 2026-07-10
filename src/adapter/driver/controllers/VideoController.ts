import type { Response } from 'express';
import type { AuthenticatedRequest } from '@adapter/infra/http/middleware/correlation.middleware';
import { SubmitVideoUseCase } from '@use-cases/videoJob/SubmitVideoUseCase';
import { ListUserVideosUseCase } from '@use-cases/videoJob/ListUserVideosUseCase';
import { GetVideoJobUseCase } from '@use-cases/videoJob/GetVideoJobUseCase';
import { DownloadVideoZipUseCase } from '@use-cases/videoJob/DownloadVideoZipUseCase';
import { UnauthorizedException } from '@domain/exceptions/ValidationException';

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

    const file = req.file;
    if (!file) {
      res.status(400).json({
        error: 'FILE_REQUIRED',
        message: 'Arquivo de vídeo obrigatório',
      });
      return;
    }

    const job = await this.submitVideo.execute({
      userId,
      originalFileName: file.originalname,
      fileBuffer: file.buffer,
      mimeType: file.mimetype,
    });

    res.status(202).json({
      id: job.id,
      status: job.status,
      originalFileName: job.originalFileName,
      createdAt: job.createdAt.toISOString(),
    });
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

    const jobId = String(req.params.id ?? '');
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

  download = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const userId = req.userId;
    if (!userId) {
      throw new UnauthorizedException();
    }

    const jobId = String(req.params.id ?? '');
    if (!jobId) {
      res.status(400).json({ error: 'INVALID_ID' });
      return;
    }

    const { stream, fileName } = await this.downloadZip.execute(userId, jobId);
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    stream.pipe(res);
  };
}
