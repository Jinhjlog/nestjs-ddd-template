import { Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { PrismaUnitOfWork } from './prisma-unit-of-work';
import { UNIT_OF_WORK } from './tokens';
import { TransactionContextService } from '@lib/infra/unit-of-work';

/**
 * Database Module
 *
 * 데이터베이스 관련 인프라 서비스를 제공합니다.
 * - PrismaService: Prisma ORM 클라이언트
 * - UnitOfWork: 트랜잭션 관리 (전역 제공)
 */
@Module({
  providers: [
    PrismaService,
    TransactionContextService,
    {
      provide: UNIT_OF_WORK,
      useClass: PrismaUnitOfWork,
    },
  ],
  exports: [PrismaService, TransactionContextService, UNIT_OF_WORK],
})
export class DatabaseModule {}
