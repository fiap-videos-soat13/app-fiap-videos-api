import { resolveS3ZipKey } from '../S3ObjectStorage';

describe('resolveS3ZipKey', () => {
  it('prefixes zip filename with zips/', () => {
    expect(resolveS3ZipKey('job-id.zip')).toBe('zips/job-id.zip');
  });

  it('keeps keys that already include zips/', () => {
    expect(resolveS3ZipKey('zips/job-id.zip')).toBe('zips/job-id.zip');
  });
});
