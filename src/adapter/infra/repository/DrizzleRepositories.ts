import { randomUUID } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { getDb } from '@adapter/infra/database/client';
import { users, videoJobs, outbox } from '@adapter/infra/database/schema';
import {
  UserRepository,
  VideoJobRepository,
  type OnVideoJobCreatedHook,
} from '@domain/repositories/VideoRepositories';
import { VideoJobStatus } from '@domain/enums/VideoJobStatus';
import type { VideoEventEnvelope } from '@validators/VideoEventEnvelopeValidator';
import { UserDbAssembler } from '@adapter/infra/repository/assemblers/UserDbAssembler';
import { VideoJobDbAssembler } from '@adapter/infra/repository/assemblers/VideoJobDbAssembler';
import type { VideoJob } from '@domain/entities/VideoJob';
import type { User } from '@domain/entities/User';
import { UserRole } from '@domain/enums/UserRole';

export class DrizzleUserRepository extends UserRepository {
  async findByEmail(email: string): Promise<User | null> {
    const [row] = await getDb()
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);
    return row ? UserDbAssembler.toDomain(row) : null;
  }

  async findById(id: string): Promise<User | null> {
    const [row] = await getDb()
      .select()
      .from(users)
      .where(eq(users.id, id))
      .limit(1);
    return row ? UserDbAssembler.toDomain(row) : null;
  }

  async create(
    email: string,
    passwordHash: string,
    role: UserRole = UserRole.User,
  ): Promise<User> {
    const [row] = await getDb()
      .insert(users)
      .values({ email, passwordHash, role })
      .returning();
    if (!row) {
      throw new Error('Failed to create user');
    }
    return UserDbAssembler.toDomain(row);
  }
}

export class DrizzleVideoJobRepository extends VideoJobRepository {
  async createJob(
    input: {
      userId: string;
      originalFileName: string;
      storageKey: string;
      correlationId: string;
    },
    onCreated?: OnVideoJobCreatedHook,
  ): Promise<VideoJob> {
    const db = getDb();
    return db.transaction(async (tx) => {
      const [row] = await tx
        .insert(videoJobs)
        .values({
          userId: input.userId,
          originalFileName: input.originalFileName,
          storageKey: input.storageKey,
          correlationId: input.correlationId,
          status: VideoJobStatus.Pending,
        })
        .returning();

      if (!row) {
        throw new Error('Failed to create video job');
      }

      const job = VideoJobDbAssembler.toDomain(row);

      if (onCreated) {
        await onCreated(job, async (envelope: VideoEventEnvelope) => {
          await tx.insert(outbox).values({
            id: envelope.eventId,
            aggregateType: 'VideoJob',
            aggregateId: job.id,
            eventType: envelope.eventType,
            payload: envelope,
            occurredAt: new Date(envelope.occurredAt),
            publishedAt: null,
            attempts: 0,
            lastError: null,
          });
        });
      }

      return job;
    });
  }

  async findByIdForUser(
    jobId: string,
    userId: string,
  ): Promise<VideoJob | null> {
    const [row] = await getDb()
      .select()
      .from(videoJobs)
      .where(eq(videoJobs.id, jobId))
      .limit(1);

    if (!row || row.userId !== userId) {
      return null;
    }
    return VideoJobDbAssembler.toDomain(row);
  }

  async listByUserId(userId: string): Promise<VideoJob[]> {
    const rows = await getDb()
      .select()
      .from(videoJobs)
      .where(eq(videoJobs.userId, userId));
    return rows.map((row) => VideoJobDbAssembler.toDomain(row));
  }

  async markCompleted(
    jobId: string,
    zipStorageKey: string,
  ): Promise<VideoJob | null> {
    const [row] = await getDb()
      .update(videoJobs)
      .set({
        status: VideoJobStatus.Completed,
        zipStorageKey,
        errorMessage: null,
        completedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(videoJobs.id, jobId))
      .returning();
    return row ? VideoJobDbAssembler.toDomain(row) : null;
  }

  async markFailed(
    jobId: string,
    errorMessage: string,
  ): Promise<VideoJob | null> {
    const [row] = await getDb()
      .update(videoJobs)
      .set({
        status: VideoJobStatus.Failed,
        errorMessage,
        updatedAt: new Date(),
      })
      .where(eq(videoJobs.id, jobId))
      .returning();
    return row ? VideoJobDbAssembler.toDomain(row) : null;
  }

  async markProcessing(jobId: string): Promise<VideoJob | null> {
    const [row] = await getDb()
      .update(videoJobs)
      .set({
        status: VideoJobStatus.Processing,
        updatedAt: new Date(),
      })
      .where(eq(videoJobs.id, jobId))
      .returning();
    return row ? VideoJobDbAssembler.toDomain(row) : null;
  }
}

export function newCorrelationId(): string {
  return randomUUID();
}
