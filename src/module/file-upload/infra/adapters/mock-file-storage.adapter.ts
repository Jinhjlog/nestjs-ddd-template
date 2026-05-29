import { Injectable } from '@nestjs/common';
import { join, extname } from 'path';
import { promises as fs } from 'fs';
import {
  FileStoragePort,
  GenerateUploadUrlParams,
  UploadUrlResult,
  FileMetadata,
} from '../../application/ports';

/** 확장자 → MIME 타입 매핑 */
const MIME_MAP: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.pdf': 'application/pdf',
  '.hwp': 'application/x-hwp',
  '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
};

/** 개발 환경용 로컬 파일시스템 기반 Mock 스토리지 어댑터 */
@Injectable()
export class MockFileStorageAdapter extends FileStoragePort {
  private readonly baseDir = join(process.cwd(), '.uploads');
  private readonly baseUrl: string;

  constructor() {
    super();
    this.baseUrl =
      process.env.APP_BASE_URL ??
      `http://localhost:${process.env.PORT ?? 3000}`;
  }

  async generateUploadUrl(
    params: GenerateUploadUrlParams,
  ): Promise<UploadUrlResult> {
    return Promise.resolve({
      uploadUrl: `${this.baseUrl}/dev/upload/${params.storageKey}`,
      method: 'PUT',
      headers: { 'Content-Type': params.mimeType },
    });
  }

  async getFileMetadata(storageKey: string): Promise<FileMetadata | undefined> {
    const filePath = join(this.baseDir, storageKey);
    try {
      const stat = await fs.stat(filePath);
      return {
        fileSize: stat.size,
        mimeType: this.inferMimeType(storageKey),
      };
    } catch {
      return undefined;
    }
  }

  async deleteFile(storageKey: string): Promise<void> {
    const filePath = join(this.baseDir, storageKey);
    try {
      await fs.unlink(filePath);
    } catch {
      // ENOENT 무시 (멱등)
    }
  }

  getServingUrl(storageKey: string): string {
    return `${this.baseUrl}/uploads/${storageKey}`;
  }

  private inferMimeType(storageKey: string): string {
    const ext = extname(storageKey).toLowerCase();
    return MIME_MAP[ext] ?? 'application/octet-stream';
  }
}
