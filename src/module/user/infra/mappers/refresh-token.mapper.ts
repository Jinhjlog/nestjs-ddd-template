import {
  Prisma,
  RefreshToken as RefreshTokenPrisma,
} from '@prisma/generated/client';
import { RefreshToken } from '../../domain/models/refresh-token';

export class RefreshTokenMapper {
  static toDomain(raw: RefreshTokenPrisma): RefreshToken {
    return RefreshToken.unsafeCreate({
      id: raw.id,
      userId: raw.userId,
      tokenHash: raw.tokenHash,
      createdAt: raw.createdAt,
      expiresAt: raw.expiresAt,
    });
  }

  static toPersistence(
    refreshToken: RefreshToken,
  ): Prisma.RefreshTokenUncheckedCreateInput {
    return {
      id: refreshToken.id.toString(),
      userId: refreshToken.userId,
      tokenHash: refreshToken.tokenHash,
      createdAt: refreshToken.createdAt,
      expiresAt: refreshToken.expiresAt,
    };
  }
}
