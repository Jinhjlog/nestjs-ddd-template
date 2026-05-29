import { PrismaService } from '../../src/module/core/database/prisma.service';

/**
 * 테스트 DB의 모든 테이블 데이터를 삭제합니다.
 * FK 체크를 일시 비활성화하여 삭제 순서 무관하게 정리합니다.
 */
export async function cleanDatabase(prisma: PrismaService): Promise<void> {
  await prisma.$executeRawUnsafe('SET FOREIGN_KEY_CHECKS = 0');

  await prisma.$transaction([
    prisma.adminRefreshToken.deleteMany(),
    prisma.admin.deleteMany(),
    prisma.refreshToken.deleteMany(),
    prisma.user.deleteMany(),
    prisma.uploadedFile.deleteMany(),
  ]);

  await prisma.$executeRawUnsafe('SET FOREIGN_KEY_CHECKS = 1');
}
