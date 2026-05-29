import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { CleanupOrphanedFilesUseCase } from '../../application/usecases';

@Injectable()
export class OrphanedFileCleanupScheduler {
  private readonly logger = new Logger(OrphanedFileCleanupScheduler.name);

  constructor(
    private readonly cleanupOrphanedFilesUseCase: CleanupOrphanedFilesUseCase,
  ) {}

  @Cron(process.env.ORPHAN_CLEANUP_CRON || '0 2 * * *', {
    timeZone: 'Asia/Seoul',
  })
  async handleCleanup(): Promise<void> {
    try {
      const { cleanedCount } = await this.cleanupOrphanedFilesUseCase.execute();
      this.logger.log(`고아 파일 ${cleanedCount}건 정리 완료`);
    } catch (error) {
      this.logger.error('고아 파일 정리 중 오류 발생', error);
    }
  }
}
