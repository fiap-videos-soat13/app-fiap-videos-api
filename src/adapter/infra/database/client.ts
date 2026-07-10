import path from 'node:path';
import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { Pool } from 'pg';
import * as schema from './schema';

let pool: Pool | null = null;
let db: NodePgDatabase<typeof schema> | null = null;

export type AppDatabase = NodePgDatabase<typeof schema>;

const MIGRATIONS_FOLDER = path.join(
  __dirname,
  'migrations',
);

export function getPool(): Pool {
  if (!pool) {
    const url = process.env.DATABASE_URL?.trim();
    if (!url) {
      throw new Error('DATABASE_URL is required');
    }
    pool = new Pool({
      connectionString: url,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 15000,
    });
  }
  return pool;
}

export function getDb(): AppDatabase {
  if (!db) {
    db = drizzle({
      client: getPool(),
      schema,
      casing: 'snake_case',
    });
  }
  return db;
}

export async function runMigrations(): Promise<void> {
  await migrate(getDb(), { migrationsFolder: MIGRATIONS_FOLDER });
}

export async function initializeConnection(): Promise<void> {
  const client = await getPool().connect();
  client.release();
}

export async function checkDatabaseConnectivity(): Promise<boolean> {
  try {
    const client = await getPool().connect();
    client.release();
    return true;
  } catch {
    return false;
  }
}

export async function closeDb(): Promise<void> {
  await pool?.end();
  pool = null;
  db = null;
}
