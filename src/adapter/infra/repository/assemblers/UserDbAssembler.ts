import { User } from "@domain/entities/User";
import { UserRole } from "@domain/enums/UserRole";
import type { users } from "@adapter/infra/database/schema/users";

type DbUser = typeof users.$inferSelect;

export class UserDbAssembler {
  static toDomain(row: DbUser): User {
    const role = row.role === UserRole.Admin ? UserRole.Admin : UserRole.User;
    return new User(row.id, row.email, row.passwordHash, role, row.createdAt);
  }
}
