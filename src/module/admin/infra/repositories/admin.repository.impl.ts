import { Injectable } from '@nestjs/common';
import { PrismaService } from '@core/database/prisma.service';
import { AdminRepository } from '../../domain/repositories/admin.repository';
import { Admin } from '../../domain/models/admin';
import { AdminMapper } from '../mappers';
import { BoundedString } from '@lib/domain';

@Injectable()
export class AdminRepositoryImpl implements AdminRepository {
  constructor(private readonly prisma: PrismaService) {}

  async save(admin: Admin): Promise<void> {
    const data = AdminMapper.toPersistence(admin);

    await this.prisma.admin.upsert({
      where: { id: data.id },
      update: data,
      create: data,
    });
  }

  async findById(id: string): Promise<Admin | undefined> {
    const record = await this.prisma.admin.findUnique({
      where: { id, deletedAt: null },
    });

    return record ? AdminMapper.toDomain(record) : undefined;
  }

  async findByLoginId(loginId: BoundedString): Promise<Admin | undefined> {
    const record = await this.prisma.admin.findFirst({
      where: { loginId: loginId.value, deletedAt: null },
    });

    return record ? AdminMapper.toDomain(record) : undefined;
  }
}
