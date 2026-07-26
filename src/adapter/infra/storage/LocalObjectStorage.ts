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

  private resolveZipPath(zipStorageKey: string): string {
    const normalized = zipStorageKey.replace(/\\/g, '/');
    if (normalized.startsWith('zips/')) {
      return path.join(this.storagePath, zipStorageKey);
    }
    return path.join(this.storagePath, 'zips', zipStorageKey);
  }

  getZipStream(zipStorageKey: string): Promise<NodeJS.ReadableStream> {
    const fullPath = this.resolveZipPath(zipStorageKey);
    return Promise.resolve(createReadStream(fullPath));
  }

  async zipExists(zipStorageKey: string): Promise<boolean> {
    const fullPath = this.resolveZipPath(zipStorageKey);
    try {
      await access(fullPath, constants.F_OK);
      return true;
    } catch {
      return false;
    }
  }
}
