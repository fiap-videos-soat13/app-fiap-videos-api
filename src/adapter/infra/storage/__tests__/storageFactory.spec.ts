import { createObjectStorage, resolveStorageBackend } from '../storageFactory';
import { S3ObjectStorage } from '../S3ObjectStorage';

describe('storageFactory', () => {
  const env = process.env;

  beforeEach(() => {
    process.env = { ...env };
    delete process.env.STORAGE_BACKEND;
    delete process.env.S3_BUCKET;
    delete process.env.S3_ENDPOINT;
    delete process.env.AWS_ACCESS_KEY_ID;
    delete process.env.AWS_SECRET_ACCESS_KEY;
  });

  afterAll(() => {
    process.env = env;
  });

  it('requires STORAGE_BACKEND to be minio or s3', () => {
    expect(() => resolveStorageBackend()).toThrow('STORAGE_BACKEND must be');
  });

  it('uses MinIO when STORAGE_BACKEND=minio', () => {
    process.env.STORAGE_BACKEND = 'minio';
    process.env.S3_BUCKET = 'fiap-videos';
    process.env.S3_ENDPOINT = 'http://localhost:9000';
    process.env.AWS_ACCESS_KEY_ID = 'minioadmin';
    process.env.AWS_SECRET_ACCESS_KEY = 'minioadmin';

    expect(resolveStorageBackend()).toBe('minio');
    const storage = createObjectStorage();
    expect(storage).toBeInstanceOf(S3ObjectStorage);
  });

  it('uses AWS S3 when STORAGE_BACKEND=s3', () => {
    process.env.STORAGE_BACKEND = 's3';
    process.env.S3_BUCKET = 'prod-bucket';

    expect(resolveStorageBackend()).toBe('s3');
    const storage = createObjectStorage();
    expect(storage).toBeInstanceOf(S3ObjectStorage);
  });

  it('throws when MinIO is selected without endpoint', () => {
    process.env.STORAGE_BACKEND = 'minio';
    process.env.S3_BUCKET = 'fiap-videos';
    process.env.AWS_ACCESS_KEY_ID = 'minioadmin';
    process.env.AWS_SECRET_ACCESS_KEY = 'minioadmin';

    expect(() => createObjectStorage()).toThrow('S3_ENDPOINT is required');
  });

  it('throws when bucket is missing', () => {
    process.env.STORAGE_BACKEND = 's3';
    expect(() => createObjectStorage()).toThrow('S3_BUCKET is required');
  });
});
