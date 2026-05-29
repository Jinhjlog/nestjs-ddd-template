import { Injectable } from '@nestjs/common';
import { PrismaService } from '@core/database/prisma.service';
import { RefreshTokenRepository } from '../../domain/repositories/refresh-token.repository';
import { RefreshToken } from '../../domain/models/refresh-token';
import { RefreshTokenMapper } from '../mappers';

@Injectable()
export class RefreshTokenRepositoryImpl implements RefreshTokenRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(refreshToken: RefreshToken): Promise<void> {
    const data = RefreshTokenMapper.toPersistence(refreshToken);

    await this.prisma.refreshToken.create({ data });
  }

  async findById(id: string): Promise<RefreshToken | undefined> {
    const record = await this.prisma.refreshToken.findUnique({
      where: { id },
    });

    return record ? RefreshTokenMapper.toDomain(record) : undefined;
  }

  async deleteById(id: string): Promise<void> {
    await this.prisma.refreshToken.delete({ where: { id } });
  }

  async deleteByIdIfExists(id: string): Promise<void> {
    await this.prisma.refreshToken.deleteMany({ where: { id } });
  }

  async deleteExpired(): Promise<number> {
    const result = await this.prisma.refreshToken.deleteMany({
      where: { expiresAt: { lt: new Date() } },
    });

    return result.count;
  }
}
