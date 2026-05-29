import { Injectable, Logger } from '@nestjs/common';
import { UploadedFile } from '../../domain/models';
import { UploadedFileRepository } from '../../domain/repositories';
import { FileStoragePort } from '../ports';

/** CONFIRMED 후 연결되지 않은 파일을 고아로 판단하는 유예 시간 (24시간) */
const CONFIRMED_GRACE_PERIOD_MS = 24 * 60 * 60 * 1000;

/** 연결 완료된 레코드의 DB 보관 기간 (7일) */
const LINKED_RETENTION_PERIOD_MS = 7 * 24 * 60 * 60 * 1000;

@Injectable()
export class CleanupOrphanedFilesUseCase {
  private readonly logger = new Logger(CleanupOrphanedFilesUseCase.name);

  constructor(
    private readonly uploadedFileRepository: UploadedFileRepository,
    private readonly fileStoragePort: FileStoragePort,
  ) {}

  /** 불필요한 UploadedFile을 정리합니다. */
  async execute(): Promise<{ cleanedCount: number }> {
    const now = new Date();
    let cleanedCount = 0;

    // 1단계: 만료된 PENDING 파일 → DB + 스토리지 삭제
    const expiredPending =
      await this.uploadedFileRepository.findExpiredPending(now);

    // 2단계: CONFIRMED 후 24시간 경과했으나 미연결 파일 → DB + 스토리지 삭제
    const gracePeriodBefore = new Date(
      now.getTime() - CONFIRMED_GRACE_PERIOD_MS,
    );
    const unlinkedConfirmed =
      await this.uploadedFileRepository.findConfirmedUnlinked(
        gracePeriodBefore,
      );

    for (const file of [...expiredPending, ...unlinkedConfirmed]) {
      cleanedCount += await this.deleteFileWithStorage(file);
    }

    // 3단계: 연결 완료 후 7일 경과한 레코드 → DB 레코드만 삭제 (스토리지 유지)
    const linkedBefore = new Date(now.getTime() - LINKED_RETENTION_PERIOD_MS);
    const expiredLinked =
      await this.uploadedFileRepository.findLinkedBefore(linkedBefore);

    for (const file of expiredLinked) {
      cleanedCount += await this.deleteRecordOnly(file);
    }

    return { cleanedCount };
  }

  /** DB 레코드 + 스토리지 파일 모두 삭제 (고아 파일용) */
  private async deleteFileWithStorage(file: UploadedFile): Promise<number> {
    const fileId = file.id.toString();

    try {
      await this.uploadedFileRepository.delete(file);
    } catch (error) {
      this.logger.warn(
        `DB 레코드 삭제 실패 - 다음 주기에 재시도 (id=${fileId}): ${error}`,
      );
      return 0;
    }

    try {
      await this.fileStoragePort.deleteFile(file.storageKey);
    } catch (error) {
      this.logger.warn(
        `스토리지 삭제 실패 - 고아 파일 잔존 가능 (id=${fileId}, key=${file.storageKey}): ${error}`,
      );
    }

    return 1;
  }

  /** DB 레코드만 삭제 (연결 완료된 파일 — 스토리지는 엔티티가 사용 중) */
  private async deleteRecordOnly(file: UploadedFile): Promise<number> {
    const fileId = file.id.toString();

    try {
      await this.uploadedFileRepository.delete(file);
      return 1;
    } catch (error) {
      this.logger.warn(
        `linked 레코드 삭제 실패 - 다음 주기에 재시도 (id=${fileId}): ${error}`,
      );
      return 0;
    }
  }
}
