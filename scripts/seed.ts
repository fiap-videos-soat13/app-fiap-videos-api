import 'dotenv/config';
import {
  runMigrations,
  getDb,
  closeDb,
} from '../src/adapter/infra/database/client';
import { bootstrapUsers } from '../src/adapter/infra/database/bootstrapUsers';

async function main(): Promise<void> {
  await runMigrations();

  const results = await bootstrapUsers(getDb(), { includeDemoUser: true });

  for (const result of results) {
    if (!result.created) {
      console.log(`Usuário já existe: ${result.email}`);
    }
  }

  await closeDb();
}

void main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
