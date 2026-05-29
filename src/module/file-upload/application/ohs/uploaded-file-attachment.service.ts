/** 외부 BC에서 사용하는 첨부파일 메타데이터 */
export interface ConfirmedFileInfo {
  /** 파일 서빙 URL */
  url: string;
  /** 스토리지 내 파일 경로 (삭제 시 사용) */
  storageKey: string;
  /** 원본 파일명 */
  originalName: string;
  /** MIME 타입 */
  mimeType: string;
  /** 파일 크기 (바이트) */
  fileSize?: number;
}

/**
 * UploadedFileAttachmentService (Open Host Service)
 * - file-upload BC가 외부 BC에 공개하는 파일 첨부 관련 공개 API
 * - 외부 BC는 이 인터페이스를 통해서만 file-upload BC와 협력
 */
export abstract class UploadedFileAttachmentService {
  /**
   * fileId의 CONFIRMED 상태와 purpose를 검증하고 메타데이터를 반환합니다.
   * @throws {EntityNotFoundException} FILE_NOT_FOUND - 파일이 존재하지 않는 경우
   * @throws {DomainRuleViolationException} FILE_NOT_CONFIRMED - CONFIRMED 상태가 아닌 경우
   * @throws {DomainRuleViolationException} FILE_PURPOSE_MISMATCH - 업로드 용도가 일치하지 않는 경우
   */
  abstract getConfirmedFileInfo(
    fileId: string,
    expectedPurpose: string,
  ): Promise<ConfirmedFileInfo>;

  /**
   * 파일을 외부 엔티티에 연결 처리합니다 (linkedAt 설정).
   * 이미 연결된 파일이어도 오류를 발생시키지 않습니다.
   */
  abstract markLinked(fileId: string): Promise<void>;

  /**
   * 스토리지에서 파일을 삭제합니다.
   * storageKey가 없거나 삭제 대상이 존재하지 않아도 에러를 던지지 않습니다.
   */
  abstract deleteStorageFile(storageKey: string): Promise<void>;
}
