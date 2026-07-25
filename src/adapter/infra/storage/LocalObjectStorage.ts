import { mkdir, writeFile, access, constants } from 'node:fs/promises';
import { createReadStream } from 'node:fs';
import path from 'node:path';
import { ObjectStoragePort } from '@domain/outboundPorts/VideoPorts';

export class LocalObjectStorage extends ObjectStoragePort {
  constructor(private readonly storagePath: string) {
    super();
  }

  async saveUploadedVideo(
    jobId: string,
    buffer: Buffer,
    originalFileName: string,
  ): Promise<string> {
    const videosDir = path.join(this.storagePath, 'videos');
    await mkdir(videosDir, { recursive: true });

    const safeFileName = path.basename(originalFileName);
    const storageKey = path.join('videos', `${jobId}-${safeFileName}`);
    const fullPath = path.join(this.storagePath, storageKey);

    await writeFile(fullPath, buffer);
    return storageKey;
  }

  getZipStream(zipStorageKey: string): NodeJS.ReadableStream {
    const fullPath = path.join(this.storagePath, zipStorageKey);
    return createReadStream(fullPath);
  }

  async zipExists(zipStorageKey: string): Promise<boolean> {
    const fullPath = path.join(this.storagePath, zipStorageKey);
    try {
      await access(fullPath, constants.F_OK);
      return true;
    } catch {
      return false;
    }
  }
}
