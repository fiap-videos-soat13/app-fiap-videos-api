import { z } from 'zod';

const VIDEO_EXTENSIONS = ['.mp4', '.mov', '.avi', '.mkv', '.webm'] as const;

export const VideoUploadInputSchema = z.object({
  originalFileName: z
    .string()
    .min(1, 'Nome do arquivo obrigatório')
    .refine(
      (name) =>
        VIDEO_EXTENSIONS.some((ext) => name.toLowerCase().endsWith(ext)),
      `Extensão inválida. Permitido: ${VIDEO_EXTENSIONS.join(', ')}`,
    ),
  fileSizeBytes: z
    .number()
    .int()
    .positive('Arquivo vazio')
    .max(
      Number(process.env.MAX_UPLOAD_BYTES) || 104857600,
      'Arquivo excede o tamanho máximo permitido',
    ),
  mimeType: z
    .string()
    .optional()
    .refine(
      (mime) => !mime || mime.startsWith('video/'),
      'MIME type deve ser de vídeo',
    ),
});

export type VideoUploadInput = z.infer<typeof VideoUploadInputSchema>;
