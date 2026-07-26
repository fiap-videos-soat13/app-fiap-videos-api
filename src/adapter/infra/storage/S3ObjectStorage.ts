import path from 'node:path';
import {
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { ObjectStoragePort } from '@domain/outboundPorts/VideoPorts';

export function resolveS3ZipKey(zipStorageKey: string): string {
  const normalized = zipStorageKey.replace(/\\/g, '/');
  if (normalized.startsWith('zips/')) {
    return normalized;
  }
  return `zips/${normalized}`;
}

export class S3ObjectStorage extends ObjectStoragePort {
  constructor(
    private readonly client: S3Client,
    private readonly bucket: string,
  ) {
    super();
  }

  async saveUploadedVideo(
    jobId: string,
    buffer: Buffer,
    originalFileName: string,
  ): Promise<string> {
    const safeFileName = path.basename(originalFileName);
    const storageKey = path.join('videos', `${jobId}-${safeFileName}`).replace(/\\/g, '/');

    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: storageKey,
        Body: buffer,
        ContentType: 'application/octet-stream',
      }),
    );

    return storageKey;
  }

  async getZipStream(zipStorageKey: string): Promise<NodeJS.ReadableStream> {
    const key = resolveS3ZipKey(zipStorageKey);
    const response = await this.client.send(
      new GetObjectCommand({
        Bucket: this.bucket,
        Key: key,
      }),
    );

    if (!response.Body) {
      throw new Error(`Zip vazio no S3: ${key}`);
    }

    return response.Body as NodeJS.ReadableStream;
  }

  async zipExists(zipStorageKey: string): Promise<boolean> {
    const key = resolveS3ZipKey(zipStorageKey);
    try {
      await this.client.send(
        new HeadObjectCommand({
          Bucket: this.bucket,
          Key: key,
        }),
      );
      return true;
    } catch {
      return false;
    }
  }
}
