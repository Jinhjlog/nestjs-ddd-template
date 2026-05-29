import { Injectable } from '@nestjs/common';
import { PrismaService } from '@core/database/prisma.service';
import { DomainEvents } from '@lib/domain/events/domain-events';
import { UploadedFileRepository } from '../../domain/repositories';
import { UploadedFile } from '../../domain/models';
import { UploadedFileMapper } from '../mappers';

@Injectable()
export class UploadedFileRepositoryImpl implements UploadedFileRepository {
  constructor(private readonly prisma: PrismaService) {}

  async save(entity: UploadedFile): Promise<void> {
    const data = UploadedFileMapper.toPersistence(entity);

    await this.prisma.uploadedFile.upsert({
      where: { id: data.id },
      create: data,
      update: data,
    });

    if (entity.domainEvents.length > 0) {
      DomainEvents.dispatchEventsForAggregate(entity.id);
    }
  }

  async findById(id: string): Promise<UploadedFile | undefined> {
    const raw = await this.prisma.uploadedFile.findUnique({
      where: { id },
    });

    if (!raw) {
      return undefined;
    }

    return UploadedFileMapper.toDomain(raw);
  }

  async findExpiredPending(now: Date): Promise<UploadedFile[]> {
    const rows = await this.prisma.uploadedFile.findMany({
      where: {
        status: 'PENDING',
        expiresAt: { lt: now },
      },
    });

    return rows.map((row) => UploadedFileMapper.toDomain(row));
  }

  async findConfirmedUnlinked(
    gracePeriodBefore: Date,
  ): Promise<UploadedFile[]> {
    const rows = await this.prisma.uploadedFile.findMany({
      where: {
        status: 'CONFIRMED',
        linkedAt: null,
        confirmedAt: { lt: gracePeriodBefore },
      },
    });

    return rows.map((row) => UploadedFileMapper.toDomain(row));
  }

  async findLinkedBefore(linkedBefore: Date): Promise<UploadedFile[]> {
    const rows = await this.prisma.uploadedFile.findMany({
      where: {
        status: 'CONFIRMED',
        linkedAt: { not: null, lt: linkedBefore },
      },
    });

    return rows.map((row) => UploadedFileMapper.toDomain(row));
  }

  async delete(entity: UploadedFile): Promise<void> {
    await this.prisma.uploadedFile.delete({
      where: { id: entity.id.toString() },
    });
  }
}
