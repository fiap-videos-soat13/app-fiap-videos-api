import { pgTable, uuid, varchar, text, timestamp } from 'drizzle-orm/pg-core';
import { UserRole } from '@domain/enums/UserRole';

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  role: varchar('role', { length: 32 })
    .notNull()
    .default(UserRole.User),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});
