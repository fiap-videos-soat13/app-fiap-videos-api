import { Router } from 'express';
import multer from 'multer';
import type { VideoController } from '../controllers/VideoController';

export function buildVideoRoutes(controller: VideoController): Router {
  const router = Router();
  const maxBytes =
    Number(process.env.MAX_UPLOAD_BYTES) || 100 * 1024 * 1024;
  const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: maxBytes },
  });

  router.post('/', upload.single('video'), controller.submit);
  router.get('/', controller.list);
  router.get('/:id/download', controller.download);
  router.get('/:id', controller.getById);
  return router;
}
