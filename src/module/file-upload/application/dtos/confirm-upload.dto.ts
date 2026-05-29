export interface ConfirmUploadDto {
  /** 파일 ID */
  fileId: string;
}

export interface ConfirmUploadResult {
  /** 파일 ID */
  fileId: string;
  /** 파일 접근 URL */
  fileUrl: string;
}
