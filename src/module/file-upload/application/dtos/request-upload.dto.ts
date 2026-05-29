export interface RequestUploadDto {
  /** 원본 파일명 */
  fileName: string;
  /** MIME 타입 */
  mimeType: string;
  /** 파일 크기 (바이트) */
  fileSize: number;
  /** 용도 (profile-image, attachment, editor-content) */
  purpose: string;
  /** 업로드 요청자 ID */
  uploadedBy: string;
}

export interface RequestUploadResult {
  /** 파일 ID */
  fileId: string;
  /** 업로드 URL */
  uploadUrl: string;
  /** HTTP 메서드 */
  method: 'PUT' | 'POST';
  /** 업로드 시 필요한 HTTP 헤더 */
  headers?: Record<string, string>;
}
