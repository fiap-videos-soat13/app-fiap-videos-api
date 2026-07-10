import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { eq } from 'drizzle-orm';
import {
  runMigrations,
  getDb,
  closeDb,
} from '../src/adapter/infra/database/client';
import { users } from '../src/adapter/infra/database/schema';

async function main(): Promise<void> {
  await runMigrations();

  const email =
    process.env.SEED_USER_EMAIL?.trim() || 'demo@fiap-videos.local';
  const password = process.env.SEED_USER_PASSWORD?.trim() || 'demo12345';

  const db = getDb();
  const [existing] = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  if (existing) {
    console.log(`Usuário demo já existe: ${email}`);
    await closeDb();
    return;
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const [created] = await db
    .insert(users)
    .values({ email, passwordHash })
    .returning();

  if (!created) {
    throw new Error('Falha ao criar usuário demo');
  }

  console.log('Usuário demo criado:');
  console.log(`  email: ${email}`);
  console.log(`  senha: ${password}`);
  await closeDb();
}

void main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
