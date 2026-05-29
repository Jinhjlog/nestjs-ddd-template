import { PrismaClient } from '@prisma/generated/client';

/**
 * Prisma 트랜잭션 클라이언트 타입
 */
export type PrismaTransactionClient = Omit<
  PrismaClient,
  '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'
>;
