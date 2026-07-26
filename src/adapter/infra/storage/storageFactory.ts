import { ObjectStoragePort } from '@domain/outboundPorts/VideoPorts';
import { LocalObjectStorage } from './LocalObjectStorage';

export function createObjectStorage(): ObjectStoragePort {
  const storagePath = process.env.STORAGE_PATH?.trim() || './storage';
  return new LocalObjectStorage(storagePath);
}
