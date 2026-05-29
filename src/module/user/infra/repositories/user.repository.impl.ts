import { Injectable } from '@nestjs/common';
import { Email } from '@lib/domain';
import { PrismaService } from '@core/database/prisma.service';
import { DomainEvents } from '@lib/domain/events/domain-events';
import { UserRepository } from '../../domain/repositories/user.repository';
import { User } from '../../domain/models/user';
import { UserMapper } from '../mappers';

@Injectable()
export class UserRepositoryImpl implements UserRepository {
  constructor(private readonly prisma: PrismaService) {}

  async save(user: User): Promise<void> {
    const data = UserMapper.toPersistence(user);

    await this.prisma.user.upsert({
      where: { id: data.id },
      update: data,
      create: data,
    });

    if (user.domainEvents.length > 0) {
      DomainEvents.dispatchEventsForAggregate(user.id);
    }
  }

  async findById(id: string): Promise<User | undefined> {
    const record = await this.prisma.user.findUnique({
      where: { id },
    });
    if (!record) {
      return undefined;
    }

    return UserMapper.toDomain(record);
  }

  async findByEmail(email: Email): Promise<User | undefined> {
    const record = await this.prisma.user.findUnique({
      where: { email: email.value },
    });
    if (!record) {
      return undefined;
    }

    return UserMapper.toDomain(record);
  }
}
