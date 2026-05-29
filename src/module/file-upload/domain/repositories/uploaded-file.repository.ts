import { UploadedFile } from '../models';

/** 업로드 파일 저장소 인터페이스 */
export abstract class UploadedFileRepository {
  /** 파일 레코드를 저장합니다 (생성/수정). */
  abstract save(entity: UploadedFile): Promise<void>;

  /** ID로 파일 레코드를 조회합니다. */
  abstract findById(id: string): Promise<UploadedFile | undefined>;

  /** 만료된 PENDING 상태 파일 목록을 조회합니다. */
  abstract findExpiredPending(now: Date): Promise<UploadedFile[]>;

  /** CONFIRMED 상태이면서 미연결이고 Grace Period가 경과한 파일 목록을 조회합니다. */
  abstract findConfirmedUnlinked(
    gracePeriodBefore: Date,
  ): Promise<UploadedFile[]>;

  /** CONFIRMED 상태이면서 연결 완료 후 보관 기간이 경과한 파일 목록을 조회합니다. */
  abstract findLinkedBefore(linkedBefore: Date): Promise<UploadedFile[]>;

  /** 파일 레코드를 삭제합니다 (Hard Delete). */
  abstract delete(entity: UploadedFile): Promise<void>;
}
