import { Injectable } from '@nestjs/common';
import { PrismaService } from '@core/database/prisma.service';
import {
  UserQueryService,
  FindAdminUserListParams,
  CountAdminUserListParams,
} from '../../domain/services/user-query.service';
import { UserProfileReadModel } from '../../domain/models/user/user-profile.read-model';
import { UserAdminListItemReadModel } from '../../domain/models/user/user-admin-list.read-model';
import { UserAdminDetailReadModel } from '../../domain/models/user/user-admin-detail.read-model';

@Injectable()
export class UserQueryServiceImpl implements UserQueryService {
  constructor(private readonly prisma: PrismaService) {}

  async findProfileById(id: string): Promise<UserProfileReadModel | undefined> {
    const record = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        isActive: true,
        createdAt: true,
      },
    });

    if (!record) {
      return undefined;
    }

    return {
      id: record.id,
      email: record.email,
      name: record.name !== null ? record.name : undefined,
      phone: record.phone !== null ? record.phone : undefined,
      isActive: record.isActive,
      createdAt: record.createdAt,
    };
  }

  async findAdminList(
    params: FindAdminUserListParams,
  ): Promise<UserAdminListItemReadModel[]> {
    const { skip, limit, name, isActive } = params;

    const records = await this.prisma.user.findMany({
      where: {
        deletedAt: null,
        ...(name && { name: { contains: name } }),
        ...(isActive !== undefined && { isActive }),
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      skip,
      take: limit,
    });

    return records.map((record) => ({
      id: record.id,
      name: record.name !== null ? record.name : undefined,
      email: record.email,
      phone: record.phone !== null ? record.phone : undefined,
      isActive: record.isActive,
      createdAt: record.createdAt,
    }));
  }

  async countAdminList(params: CountAdminUserListParams): Promise<number> {
    const { name, isActive } = params;

    return this.prisma.user.count({
      where: {
        deletedAt: null,
        ...(name && { name: { contains: name } }),
        ...(isActive !== undefined && { isActive }),
      },
    });
  }

  async findAdminDetailById(
    id: string,
  ): Promise<UserAdminDetailReadModel | undefined> {
    const record = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!record) {
      return undefined;
    }

    return {
      id: record.id,
      name: record.name !== null ? record.name : undefined,
      email: record.email,
      phone: record.phone !== null ? record.phone : undefined,
      isActive: record.isActive,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
      deletedAt: record.deletedAt !== null ? record.deletedAt : undefined,
    };
  }
}
