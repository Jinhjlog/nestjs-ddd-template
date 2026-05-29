import {
  Prisma,
  UploadedFile as UploadedFilePrisma,
} from '@prisma/generated/client';
import { BoundedString } from '@lib/domain';
import { UploadedFile, FileStatus } from '../../domain/models';

/** UploadedFile Aggregate Root 영속성 ↔ 도메인 매핑 */
export class UploadedFileMapper {
  static toDomain(raw: UploadedFilePrisma): UploadedFile {
    return UploadedFile.unsafeCreate({
      id: raw.id,
      storageKey: raw.storageKey,
      originalName: BoundedString.unsafeCreate(raw.originalName),
      mimeType: raw.mimeType,
      fileSize: raw.fileSize !== null ? raw.fileSize : undefined,
      status: FileStatus.unsafeCreate(raw.status),
      purpose: raw.purpose,
      uploadedBy: raw.uploadedBy,
      expiresAt: raw.expiresAt,
      confirmedAt: raw.confirmedAt !== null ? raw.confirmedAt : undefined,
      linkedAt: raw.linkedAt !== null ? raw.linkedAt : undefined,
      createdAt: raw.createdAt,
    });
  }

  static toPersistence(
    entity: UploadedFile,
  ): Prisma.UploadedFileUncheckedCreateInput {
    return {
      id: entity.id.toString(),
      storageKey: entity.storageKey,
      originalName: entity.originalName.value,
      mimeType: entity.mimeType,
      fileSize: entity.fileSize !== undefined ? entity.fileSize : null,
      status: entity.status.value,
      purpose: entity.purpose,
      uploadedBy: entity.uploadedBy,
      expiresAt: entity.expiresAt,
      confirmedAt: entity.confirmedAt !== undefined ? entity.confirmedAt : null,
      linkedAt: entity.linkedAt !== undefined ? entity.linkedAt : null,
      createdAt: entity.createdAt,
    };
  }
}
