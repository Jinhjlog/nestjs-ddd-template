import { Prisma, Admin as AdminPrisma } from '@prisma/generated/client';
import { Admin } from '../../domain/models/admin';
import { AdminRole } from '../../domain/models/admin';
import { BoundedString, Email, Password } from '@lib/domain';

export class AdminMapper {
  static toDomain(raw: AdminPrisma): Admin {
    return Admin.unsafeCreate({
      id: raw.id,
      loginId: BoundedString.unsafeCreate(raw.loginId),
      password: Password.unsafeCreate(raw.passwordHash, true),
      name: BoundedString.unsafeCreate(raw.name),
      email: raw.email !== null ? Email.unsafeCreate(raw.email) : undefined,
      role: AdminRole.unsafeCreate(raw.role),
      isActive: raw.isActive,
      lastLoginAt: raw.lastLoginAt !== null ? raw.lastLoginAt : undefined,
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
      deletedAt: raw.deletedAt !== null ? raw.deletedAt : undefined,
    });
  }

  static toPersistence(admin: Admin): Prisma.AdminUncheckedCreateInput {
    return {
      id: admin.id.toString(),
      loginId: admin.loginId.value,
      passwordHash: admin.password.value,
      name: admin.name.value,
      email: admin.email !== undefined ? admin.email.value : null,
      role: admin.role.value,
      isActive: admin.isActive,
      lastLoginAt: admin.lastLoginAt !== undefined ? admin.lastLoginAt : null,
      createdAt: admin.createdAt,
      updatedAt: admin.updatedAt,
      deletedAt: admin.deletedAt !== undefined ? admin.deletedAt : null,
    };
  }
}
