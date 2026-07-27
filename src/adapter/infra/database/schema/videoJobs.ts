import { pgTable, uuid, varchar, text, timestamp } from "drizzle-orm/pg-core";
import { users } from "./users";

export const videoJobs = pgTable("video_jobs", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id),
  originalFileName: varchar("original_file_name", { length: 512 }).notNull(),
  storageKey: text("storage_key").notNull(),
  zipStorageKey: text("zip_storage_key"),
  status: varchar("status", { length: 32 }).notNull(),
  errorMessage: text("error_message"),
  correlationId: uuid("correlation_id").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  completedAt: timestamp("completed_at", { withTimezone: true }),
});
