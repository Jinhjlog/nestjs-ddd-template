import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { RefreshTokenRepository } from '../../domain/repositories/refresh-token.repository';

@Injectable()
export class ExpiredRefreshTokenCleanupScheduler {
  private readonly logger = new Logger(
    ExpiredRefreshTokenCleanupScheduler.name,
  );

  constructor(
    private readonly refreshTokenRepository: RefreshTokenRepository,
  ) {}

  @Cron('0 3 * * *', { timeZone: 'Asia/Seoul' })
  async handleCleanup(): Promise<void> {
    try {
      const deletedCount = await this.refreshTokenRepository.deleteExpired();
      this.logger.log(`만료된 리프레시 토큰 ${deletedCount}건 삭제 완료`);
    } catch (error) {
      this.logger.error('만료된 리프레시 토큰 정리 중 오류 발생', error);
    }
  }
}
