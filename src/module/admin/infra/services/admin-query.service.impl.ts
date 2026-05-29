import { Injectable } from '@nestjs/common';
import { PrismaService } from '@core/database/prisma.service';
import { AdminQueryService } from '../../domain/services/admin-query.service';
import { AdminListItemReadModel } from '../../domain/models/admin/admin-list.read-model';
import { AdminDetailReadModel } from '../../domain/models/admin/admin-detail.read-model';

@Injectable()
export class AdminQueryServiceImpl implements AdminQueryService {
  constructor(private readonly prisma: PrismaService) {}

  async findList(): Promise<AdminListItemReadModel[]> {
    const records = await this.prisma.admin.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: 'desc' },
    });

    return records.map((record) => ({
      id: record.id,
      loginId: record.loginId,
      name: record.name,
      email: record.email !== null ? record.email : undefined,
      role: record.role,
      isActive: record.isActive,
      lastLoginAt: record.lastLoginAt !== null ? record.lastLoginAt : undefined,
      createdAt: record.createdAt,
    }));
  }

  async findDetailById(id: string): Promise<AdminDetailReadModel | undefined> {
    const record = await this.prisma.admin.findFirst({
      where: { id, deletedAt: null },
    });

    if (!record) return undefined;

    return {
      id: record.id,
      loginId: record.loginId,
      name: record.name,
      email: record.email !== null ? record.email : undefined,
      role: record.role,
      isActive: record.isActive,
      lastLoginAt: record.lastLoginAt !== null ? record.lastLoginAt : undefined,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    };
  }
}
