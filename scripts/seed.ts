import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { eq } from 'drizzle-orm';
import {
  runMigrations,
  getDb,
  closeDb,
} from '../src/adapter/infra/database/client';
import { users } from '../src/adapter/infra/database/schema';
import { UserRole } from '../src/core/domain/enums/UserRole';

async function main(): Promise<void> {
  await runMigrations();

  const adminEmail =
    process.env.SEED_ADMIN_EMAIL?.trim() || 'admin@fiap-videos.local';
  const adminPassword =
    process.env.SEED_ADMIN_PASSWORD?.trim() || 'Admin12345';
  const demoEmail =
    process.env.SEED_USER_EMAIL?.trim() || 'demo@fiap-videos.local';
  const demoPassword = process.env.SEED_USER_PASSWORD?.trim() || 'Demo12345';

  const db = getDb();

  for (const entry of [
    { email: adminEmail, password: adminPassword, role: UserRole.Admin },
    { email: demoEmail, password: demoPassword, role: UserRole.User },
  ]) {
    const [existing] = await db
      .select()
      .from(users)
      .where(eq(users.email, entry.email))
      .limit(1);

    if (existing) {
      console.log(`Usuário já existe: ${entry.email}`);
      continue;
    }

    const passwordHash = await bcrypt.hash(entry.password, 10);
    await db.insert(users).values({
      email: entry.email,
      passwordHash,
      role: entry.role,
    });

    console.log(`Usuário criado (${entry.role}):`);
    console.log(`  email: ${entry.email}`);
    console.log(`  senha: ${entry.password}`);
  }

  await closeDb();
}

void main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
