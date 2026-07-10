import { User } from '@domain/entities/User';
import type { users } from '@adapter/infra/database/schema/users';

type DbUser = typeof users.$inferSelect;

export class UserDbAssembler {
  static toDomain(row: DbUser): User {
    return new User(row.id, row.email, row.passwordHash, row.createdAt);
  }
}
