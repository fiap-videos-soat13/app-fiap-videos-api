import { defineConfig } from 'drizzle-kit';

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL must be configured.');
}

export default defineConfig({
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },
  schema: 'src/adapter/infra/database/schema',
  out: 'src/adapter/infra/database/migrations',
  casing: 'snake_case',
});
