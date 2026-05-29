import { Prisma, User as UserPrisma } from '@prisma/generated/client';
import { User } from '../../domain/models/user';
import { BoundedString, Email, Password, Phone } from '@lib/domain';

export class UserMapper {
  static toDomain(raw: UserPrisma): User {
    return User.unsafeCreate({
      id: raw.id,
      email: Email.unsafeCreate(raw.email),
      password: Password.unsafeCreate(raw.password, true),
      name:
        raw.name !== null ? BoundedString.unsafeCreate(raw.name) : undefined,
      phone: raw.phone !== null ? Phone.unsafeCreate(raw.phone) : undefined,
      isActive: raw.isActive,
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
      deletedAt: raw.deletedAt !== null ? raw.deletedAt : undefined,
    });
  }

  static toPersistence(user: User): Prisma.UserUncheckedCreateInput {
    return {
      id: user.id.toString(),
      email: user.email.value,
      password: user.password.value,
      name: user.name !== undefined ? user.name.value : null,
      phone: user.phone !== undefined ? user.phone.value : null,
      isActive: user.isActive,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      deletedAt: user.deletedAt !== undefined ? user.deletedAt : null,
    };
  }
}
