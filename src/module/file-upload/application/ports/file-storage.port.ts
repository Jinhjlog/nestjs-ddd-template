export interface GenerateUploadUrlParams {
  /** 스토리지 내 파일 경로 */
  storageKey: string;
  /** 허용 MIME 타입 */
  mimeType: string;
  /** 최대 파일 크기 (바이트) */
  maxFileSize: number;
  /** URL 만료 시간 (초) */
  expiresInSeconds: number;
}

export interface UploadUrlResult {
  /** 업로드 URL */
  uploadUrl: string;
  /** HTTP 메서드 */
  method: 'PUT' | 'POST';
  /** 업로드 시 필요한 HTTP 헤더 */
  headers?: Record<string, string>;
}

export interface FileMetadata {
  /** 실제 파일 크기 (바이트) */
  fileSize: number;
  /** 실제 MIME 타입 */
  mimeType: string;
}

/** 파일 스토리지 추상화 포트 */
export abstract class FileStoragePort {
  /** Presigned Upload URL을 생성합니다. */
  abstract generateUploadUrl(
    params: GenerateUploadUrlParams,
  ): Promise<UploadUrlResult>;

  /** 스토리지에 파일이 존재하는지 확인하고 메타데이터를 반환합니다. */
  abstract getFileMetadata(
    storageKey: string,
  ): Promise<FileMetadata | undefined>;

  /** 스토리지에서 파일을 삭제합니다. 파일이 없어도 에러를 던지지 않습니다. */
  abstract deleteFile(storageKey: string): Promise<void>;

  /** 스토리지 키를 공개 서빙 URL로 변환합니다. */
  abstract getServingUrl(storageKey: string): string;
}
