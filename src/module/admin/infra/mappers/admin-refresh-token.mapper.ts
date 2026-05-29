import {
  Prisma,
  AdminRefreshToken as AdminRefreshTokenPrisma,
} from '@prisma/generated/client';
import { AdminRefreshToken } from '../../domain/models/admin-refresh-token';

export class AdminRefreshTokenMapper {
  static toDomain(raw: AdminRefreshTokenPrisma): AdminRefreshToken {
    return AdminRefreshToken.unsafeCreate({
      id: raw.id,
      adminId: raw.adminId,
      tokenHash: raw.tokenHash,
      expiresAt: raw.expiresAt,
      createdAt: raw.createdAt,
    });
  }

  static toPersistence(
    token: AdminRefreshToken,
  ): Prisma.AdminRefreshTokenUncheckedCreateInput {
    return {
      id: token.id.toString(),
      adminId: token.adminId,
      tokenHash: token.tokenHash,
      expiresAt: token.expiresAt,
      createdAt: token.createdAt,
    };
  }
}
