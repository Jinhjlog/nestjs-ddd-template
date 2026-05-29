import { ulid } from 'ulid';
import { PrismaService } from '../../../src/module/core/database/prisma.service';

type FileStatus = 'PENDING' | 'CONFIRMED';

interface SeedUploadedFileOptions {
  id?: string;
  storageKey?: string;
  originalName?: string;
  mimeType?: string;
  fileSize?: number;
  status?: FileStatus;
  purpose?: string;
  uploadedBy: string;
  expiresAt?: Date;
  confirmedAt?: Date;
  linkedAt?: Date;
}

interface SeededUploadedFile {
  id: string;
  storageKey: string;
  originalName: string;
  status: string;
  purpose: string;
}

/** 테스트용 업로드 파일 레코드를 DB에 생성합니다. uploadedBy는 필수입니다. */
export async function seedUploadedFile(
  prisma: PrismaService,
  overrides: SeedUploadedFileOptions,
): Promise<SeededUploadedFile> {
  const id = overrides.id ?? ulid();
  const purpose = overrides.purpose ?? 'notice';
  const originalName = overrides.originalName ?? 'test-file.jpg';
  const now = new Date();
  const yearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const ext = originalName.includes('.')
    ? originalName.split('.').pop()!.toLowerCase()
    : 'bin';
  const storageKey =
    overrides.storageKey ?? `${purpose}/${yearMonth}/${id}.${ext}`;

  const file = await prisma.uploadedFile.create({
    data: {
      id,
      storageKey,
      originalName,
      mimeType: overrides.mimeType ?? 'image/jpeg',
      fileSize: overrides.fileSize ?? null,
      status: overrides.status ?? 'PENDING',
      purpose,
      uploadedBy: overrides.uploadedBy,
      expiresAt:
        overrides.expiresAt ?? new Date(now.getTime() + 15 * 60 * 1000),
      confirmedAt: overrides.confirmedAt ?? null,
      linkedAt: overrides.linkedAt ?? null,
    },
  });

  return {
    id: file.id,
    storageKey: file.storageKey,
    originalName: file.originalName,
    status: file.status,
    purpose: file.purpose,
  };
}
