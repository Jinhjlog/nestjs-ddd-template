import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { AdminRefreshTokenRepository } from '../../domain/repositories/admin-refresh-token.repository';

@Injectable()
export class ExpiredAdminRefreshTokenCleanupScheduler {
  private readonly logger = new Logger(
    ExpiredAdminRefreshTokenCleanupScheduler.name,
  );

  constructor(
    private readonly adminRefreshTokenRepository: AdminRefreshTokenRepository,
  ) {}

  @Cron('0 3 * * *', { timeZone: 'Asia/Seoul' })
  async handleCleanup(): Promise<void> {
    try {
      const deletedCount =
        await this.adminRefreshTokenRepository.deleteExpired();
      this.logger.log(
        `만료된 관리자 리프레시 토큰 ${deletedCount}건 삭제 완료`,
      );
    } catch (error) {
      this.logger.error('만료된 관리자 리프레시 토큰 정리 중 오류 발생', error);
    }
  }
}
