import { Injectable } from '@nestjs/common';
import { PrismaService } from '@core/database/prisma.service';
import { AdminRefreshTokenRepository } from '../../domain/repositories/admin-refresh-token.repository';
import { AdminRefreshToken } from '../../domain/models/admin-refresh-token';
import { AdminRefreshTokenMapper } from '../mappers';

@Injectable()
export class AdminRefreshTokenRepositoryImpl implements AdminRefreshTokenRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(token: AdminRefreshToken): Promise<void> {
    const data = AdminRefreshTokenMapper.toPersistence(token);

    await this.prisma.adminRefreshToken.create({ data });
  }

  async findById(id: string): Promise<AdminRefreshToken | undefined> {
    const record = await this.prisma.adminRefreshToken.findUnique({
      where: { id },
    });

    return record ? AdminRefreshTokenMapper.toDomain(record) : undefined;
  }

  async deleteByAdminId(adminId: string): Promise<void> {
    await this.prisma.adminRefreshToken.deleteMany({
      where: { adminId },
    });
  }

  async deleteByIdIfExists(id: string): Promise<void> {
    await this.prisma.adminRefreshToken.deleteMany({
      where: { id },
    });
  }

  async deleteExpired(): Promise<number> {
    const result = await this.prisma.adminRefreshToken.deleteMany({
      where: { expiresAt: { lt: new Date() } },
    });

    return result.count;
  }
}
