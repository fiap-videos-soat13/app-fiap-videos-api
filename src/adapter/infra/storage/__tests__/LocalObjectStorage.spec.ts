import { mkdtempSync, writeFileSync, rmSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { LocalObjectStorage } from "../LocalObjectStorage";

describe("LocalObjectStorage", () => {
  let tempDir: string;
  let storage: LocalObjectStorage;

  beforeEach(() => {
    tempDir = mkdtempSync(path.join(tmpdir(), "fiap-storage-"));
    storage = new LocalObjectStorage(tempDir);
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  describe("zipExists", () => {
    it("finds zip files under the zips/ subdirectory when key has no directory prefix", async () => {
      const zipKey = "3e4078c4-1c50-4276-809f-d22636ff12fc.zip";
      const zipDir = path.join(tempDir, "zips");
      mkdirSync(zipDir, { recursive: true });
      const zipPath = path.join(zipDir, zipKey);
      writeFileSync(zipPath, "zip-content");

      await expect(storage.zipExists(zipKey)).resolves.toBe(true);
    });

    it("finds zip files when key already includes the zips/ prefix", async () => {
      const zipKey = "zips/job.zip";
      const zipDir = path.join(tempDir, "zips");
      mkdirSync(zipDir, { recursive: true });
      const zipPath = path.join(zipDir, "job.zip");
      writeFileSync(zipPath, "zip-content");

      await expect(storage.zipExists(zipKey)).resolves.toBe(true);
    });

    it("returns false when zip file does not exist", async () => {
      await expect(storage.zipExists("missing.zip")).resolves.toBe(false);
    });
  });

  describe("getZipStream", () => {
    it("reads zip files from the zips/ subdirectory when key has no directory prefix", async () => {
      const zipKey = "3e4078c4-1c50-4276-809f-d22636ff12fc.zip";
      const zipDir = path.join(tempDir, "zips");
      mkdirSync(zipDir, { recursive: true });
      const zipPath = path.join(zipDir, zipKey);
      writeFileSync(zipPath, "zip-content");

      const stream = await storage.getZipStream(zipKey);
      expect(stream).toBeDefined();
      stream.on("error", () => {
        // suppress unhandled error when temp dir is cleaned up
      });
    });
  });
});
