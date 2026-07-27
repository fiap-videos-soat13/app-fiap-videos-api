import { randomUUID } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { Inbox } from "../Inbox";
import { getDb } from "@adapter/infra/database/client";
import { processedEvents } from "@adapter/infra/database/schema";
import { ConsoleLoggerService } from "@adapter/infra/services/ConsoleLoggerService";
import { VideoEventType } from "@validators/VideoEventEnvelopeValidator";
import type { VideoEventEnvelope } from "@validators/VideoEventEnvelopeValidator";

function buildEnvelope(eventId = randomUUID()): VideoEventEnvelope {
  return {
    eventId,
    correlationId: randomUUID(),
    workflowId: randomUUID(),
    videoJobId: randomUUID(),
    eventType: VideoEventType.VideoProcessingCompleted,
    occurredAt: new Date().toISOString(),
    schemaVersion: 1,
    payload: {
      userId: randomUUID(),
      userEmail: "inbox@fiap.local",
      originalFileName: "video.mp4",
      zipStorageKey: "zips/video.zip",
      completedAt: new Date().toISOString(),
    },
  };
}

async function countRows(
  eventId: string,
  consumerName: string,
): Promise<number> {
  const rows = await getDb()
    .select()
    .from(processedEvents)
    .where(
      and(
        eq(processedEvents.eventId, eventId),
        eq(processedEvents.consumerName, consumerName),
      ),
    );
  return rows.length;
}

describe("Inbox integration", () => {
  const inbox = new Inbox(new ConsoleLoggerService("inbox-integration-test"));
  const consumer = "api.VideoProcessingCompleted";

  it("processes a new event and persists the processed_events row", async () => {
    const envelope = buildEnvelope();
    let handled = 0;

    const processed = await inbox.runOnce(envelope, consumer, () => {
      handled += 1;
      return Promise.resolve();
    });

    expect(processed).toBe(true);
    expect(handled).toBe(1);
    expect(await countRows(envelope.eventId, consumer)).toBe(1);
  });

  it("skips a duplicate event for the same consumer", async () => {
    const envelope = buildEnvelope();
    let handled = 0;
    const handler = (): Promise<void> => {
      handled += 1;
      return Promise.resolve();
    };

    expect(await inbox.runOnce(envelope, consumer, handler)).toBe(true);
    expect(await inbox.runOnce(envelope, consumer, handler)).toBe(false);

    expect(handled).toBe(1);
    expect(await countRows(envelope.eventId, consumer)).toBe(1);
  });

  it("processes the same event for a different consumer", async () => {
    const envelope = buildEnvelope();
    const otherConsumer = "api.VideoProcessingCompleted.audit";

    const noop = (): Promise<void> => Promise.resolve();

    expect(await inbox.runOnce(envelope, consumer, noop)).toBe(true);
    expect(await inbox.runOnce(envelope, otherConsumer, noop)).toBe(true);

    expect(await countRows(envelope.eventId, consumer)).toBe(1);
    expect(await countRows(envelope.eventId, otherConsumer)).toBe(1);
  });

  it("removes the processed_events row when the handler fails, allowing a retry", async () => {
    const envelope = buildEnvelope();
    let attempts = 0;

    await expect(
      inbox.runOnce(envelope, consumer, () => {
        attempts += 1;
        return Promise.reject(new Error("handler exploded"));
      }),
    ).rejects.toThrow("handler exploded");

    expect(attempts).toBe(1);
    expect(await countRows(envelope.eventId, consumer)).toBe(0);

    const retried = await inbox.runOnce(envelope, consumer, () => {
      attempts += 1;
      return Promise.resolve();
    });

    expect(retried).toBe(true);
    expect(attempts).toBe(2);
    expect(await countRows(envelope.eventId, consumer)).toBe(1);
  });
});
