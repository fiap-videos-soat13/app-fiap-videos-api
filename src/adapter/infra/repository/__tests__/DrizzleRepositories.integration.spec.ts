import { randomUUID } from "node:crypto";
import {
  DrizzleUserRepository,
  DrizzleVideoJobRepository,
} from "../DrizzleRepositories";
import { UserRole } from "@domain/enums/UserRole";
import { VideoJobStatus } from "@domain/enums/VideoJobStatus";
import { VideoEventType } from "@validators/VideoEventEnvelopeValidator";
import type { VideoEventEnvelope } from "@validators/VideoEventEnvelopeValidator";
import { getDb } from "@adapter/infra/database/client";
import { outbox } from "@adapter/infra/database/schema";
import { eq } from "drizzle-orm";

describe("DrizzleRepositories integration", () => {
  const users = new DrizzleUserRepository();
  const videoJobs = new DrizzleVideoJobRepository();

  describe("DrizzleUserRepository", () => {
    it("creates and finds a user by email", async () => {
      const created = await users.create(
        "integration@fiap.local",
        "hashed-password",
        UserRole.User,
      );

      expect(created.email).toBe("integration@fiap.local");
      expect(created.role).toBe(UserRole.User);

      const found = await users.findByEmail("integration@fiap.local");
      expect(found).not.toBeNull();
      expect(found?.id).toBe(created.id);
    });

    it("finds a user by id", async () => {
      const created = await users.create(
        "by-id@fiap.local",
        "hashed-password",
        UserRole.Admin,
      );

      const found = await users.findById(created.id);
      expect(found).not.toBeNull();
      expect(found?.email).toBe("by-id@fiap.local");
      expect(found?.role).toBe(UserRole.Admin);
    });

    it("returns null when user is not found", async () => {
      const found = await users.findById(randomUUID());
      expect(found).toBeNull();
    });

    it("throws when creating a user with a duplicate email", async () => {
      await users.create("duplicate@fiap.local", "hash", UserRole.User);

      await expect(
        users.create("duplicate@fiap.local", "other-hash", UserRole.User),
      ).rejects.toThrow();
    });
  });

  describe("DrizzleVideoJobRepository", () => {
    async function createUser(email: string): Promise<{ id: string }> {
      const user = await users.create(email, "hash", UserRole.User);
      return { id: user.id };
    }

    it("creates a video job", async () => {
      const user = await createUser("job-create@fiap.local");

      const job = await videoJobs.createJob({
        userId: user.id,
        originalFileName: "video.mp4",
        storageKey: "videos/job-video.mp4",
        correlationId: randomUUID(),
      });

      expect(job.userId).toBe(user.id);
      expect(job.originalFileName).toBe("video.mp4");
      expect(job.status).toBe(VideoJobStatus.Pending);
    });

    it("persists outbox row when onCreated hook emits an envelope", async () => {
      const user = await createUser("job-outbox@fiap.local");
      const envelope: VideoEventEnvelope = {
        eventId: randomUUID(),
        correlationId: randomUUID(),
        workflowId: randomUUID(),
        videoJobId: randomUUID(),
        eventType: VideoEventType.VideoProcessingRequested,
        occurredAt: new Date().toISOString(),
        schemaVersion: 1,
        payload: {
          userId: user.id,
          userEmail: "job-outbox@fiap.local",
          originalFileName: "video.mp4",
          storageKey: "videos/job-video.mp4",
        },
      };

      const job = await videoJobs.createJob(
        {
          userId: user.id,
          originalFileName: "video.mp4",
          storageKey: "videos/job-video.mp4",
          correlationId: randomUUID(),
        },
        async (_job, emit) => {
          await emit(envelope);
        },
      );

      const rows = await getDb()
        .select()
        .from(outbox)
        .where(eq(outbox.aggregateId, job.id));

      expect(rows).toHaveLength(1);
      expect(rows[0].eventType).toBe(VideoEventType.VideoProcessingRequested);
      expect(rows[0].publishedAt).toBeNull();
    });

    it("lists only jobs for the requested user", async () => {
      const userA = await createUser("user-a@fiap.local");
      const userB = await createUser("user-b@fiap.local");

      await videoJobs.createJob({
        userId: userA.id,
        originalFileName: "a1.mp4",
        storageKey: "videos/a1.mp4",
        correlationId: randomUUID(),
      });
      await videoJobs.createJob({
        userId: userA.id,
        originalFileName: "a2.mp4",
        storageKey: "videos/a2.mp4",
        correlationId: randomUUID(),
      });
      await videoJobs.createJob({
        userId: userB.id,
        originalFileName: "b1.mp4",
        storageKey: "videos/b1.mp4",
        correlationId: randomUUID(),
      });

      const jobsA = await videoJobs.listByUserId(userA.id);
      expect(jobsA).toHaveLength(2);
      expect(jobsA.map((j) => j.originalFileName).sort()).toEqual([
        "a1.mp4",
        "a2.mp4",
      ]);

      const jobsB = await videoJobs.listByUserId(userB.id);
      expect(jobsB).toHaveLength(1);
      expect(jobsB[0].originalFileName).toBe("b1.mp4");
    });

    it("marks a job as processing, completed, and failed", async () => {
      const user = await createUser("job-state@fiap.local");
      const created = await videoJobs.createJob({
        userId: user.id,
        originalFileName: "state.mp4",
        storageKey: "videos/state.mp4",
        correlationId: randomUUID(),
      });

      const processing = await videoJobs.markProcessing(created.id);
      expect(processing?.status).toBe(VideoJobStatus.Processing);

      const completed = await videoJobs.markCompleted(
        created.id,
        "zips/state.zip",
      );
      expect(completed?.status).toBe(VideoJobStatus.Completed);
      expect(completed?.zipStorageKey).toBe("zips/state.zip");
      expect(completed?.completedAt).not.toBeNull();

      const failed = await videoJobs.markFailed(created.id, "codec error");
      expect(failed?.status).toBe(VideoJobStatus.Failed);
      expect(failed?.errorMessage).toBe("codec error");
    });

    it("finds a job only for its owner", async () => {
      const owner = await createUser("owner@fiap.local");
      const other = await createUser("other@fiap.local");

      const job = await videoJobs.createJob({
        userId: owner.id,
        originalFileName: "owned.mp4",
        storageKey: "videos/owned.mp4",
        correlationId: randomUUID(),
      });

      const foundOwner = await videoJobs.findByIdForUser(job.id, owner.id);
      expect(foundOwner).not.toBeNull();

      const foundOther = await videoJobs.findByIdForUser(job.id, other.id);
      expect(foundOther).toBeNull();
    });
  });
});
