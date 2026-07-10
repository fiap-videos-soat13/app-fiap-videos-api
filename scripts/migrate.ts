import 'dotenv/config';
import { runMigrations, closeDb } from '../src/adapter/infra/database/client';

async function main(): Promise<void> {
  await runMigrations();
  console.log('Migrations applied');
  await closeDb();
}

void main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
