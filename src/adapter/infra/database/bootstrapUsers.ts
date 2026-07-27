import { eq } from "drizzle-orm";
import { BcryptPasswordHasher } from "@adapter/infra/auth/AuthAdapters";
import { UserRole } from "@domain/enums/UserRole";
import { type AppDatabase } from "./client";
import { users } from "./schema";

export type BootstrapUsersOptions = {
  includeDemoUser?: boolean;
};

export type BootstrapUserResult = {
  email: string;
  role: UserRole;
  created: boolean;
};

type SeedEntry = {
  email: string;
  password: string;
  role: UserRole;
};

function resolveAdminCredentials(): SeedEntry {
  const email = process.env.SEED_ADMIN_EMAIL?.trim();
  const password = process.env.SEED_ADMIN_PASSWORD?.trim();
  const isProduction = process.env.NODE_ENV === "production";

  if (isProduction) {
    if (!email || !password) {
      throw new Error(
        "SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD are required when BOOTSTRAP_USERS=true in production",
      );
    }
    return { email, password, role: UserRole.Admin };
  }

  return {
    email: email || "admin@fiap-videos.local",
    password: password || "Admin12345",
    role: UserRole.Admin,
  };
}

function resolveDemoCredentials(): SeedEntry {
  return {
    email: process.env.SEED_USER_EMAIL?.trim() || "demo@fiap-videos.local",
    password: process.env.SEED_USER_PASSWORD?.trim() || "Demo12345",
    role: UserRole.User,
  };
}

export async function bootstrapUsers(
  db: AppDatabase,
  options: BootstrapUsersOptions = {},
): Promise<BootstrapUserResult[]> {
  const passwordHasher = new BcryptPasswordHasher();
  const entries: SeedEntry[] = [resolveAdminCredentials()];

  if (options.includeDemoUser) {
    entries.push(resolveDemoCredentials());
  }

  const results: BootstrapUserResult[] = [];
  const isProduction = process.env.NODE_ENV === "production";

  for (const entry of entries) {
    const [existing] = await db
      .select()
      .from(users)
      .where(eq(users.email, entry.email))
      .limit(1);

    if (existing) {
      results.push({
        email: entry.email,
        role: entry.role,
        created: false,
      });
      continue;
    }

    const passwordHash = await passwordHasher.hash(entry.password);
    await db.insert(users).values({
      email: entry.email,
      passwordHash,
      role: entry.role,
    });

    results.push({
      email: entry.email,
      role: entry.role,
      created: true,
    });

    if (isProduction) {
      console.log(`Bootstrap user created (${entry.role}): ${entry.email}`);
    } else {
      console.log(
        `Bootstrap user created (${entry.role}): ${entry.email} / ${entry.password}`,
      );
    }
  }

  return results;
}
