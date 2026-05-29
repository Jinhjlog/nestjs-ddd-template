import { Injectable } from '@nestjs/common';
import {
  DomainRuleViolationException,
  EntityNotFoundException,
} from '@shared/exception';
import { UploadedFileRepository } from '../../domain/repositories';
import { FileStoragePort } from '../../application/ports';
import {
  UploadedFileAttachmentService,
  ConfirmedFileInfo,
} from '../../application/ohs/uploaded-file-attachment.service';

@Injectable()
export class UploadedFileAttachmentServiceImpl implements UploadedFileAttachmentService {
  constructor(
    private readonly uploadedFileRepository: UploadedFileRepository,
    private readonly fileStoragePort: FileStoragePort,
  ) {}

  async getConfirmedFileInfo(
    fileId: string,
    expectedPurpose: string,
  ): Promise<ConfirmedFileInfo> {
    const uploaded = await this.uploadedFileRepository.findById(fileId);

    if (!uploaded) {
      throw new EntityNotFoundException({
        id: fileId,
        entityName: 'UploadedFile',
        errorCode: 'FILE_NOT_FOUND',
      });
    }

    if (!uploaded.isConfirmed()) {
      throw new DomainRuleViolationException({
        entityName: 'UploadedFile',
        reason: '확인되지 않은 파일은 첨부할 수 없습니다.',
        errorCode: 'FILE_NOT_CONFIRMED',
      });
    }

    if (!uploaded.isForPurpose(expectedPurpose)) {
      throw new DomainRuleViolationException({
        entityName: 'UploadedFile',
        reason: `파일 업로드 용도가 일치하지 않습니다. 요청: ${expectedPurpose}`,
        errorCode: 'FILE_PURPOSE_MISMATCH',
      });
    }

    return {
      url: this.fileStoragePort.getServingUrl(uploaded.storageKey),
      storageKey: uploaded.storageKey,
      originalName: uploaded.originalName.value,
      mimeType: uploaded.mimeType,
      fileSize: uploaded.fileSize,
    };
  }

  async markLinked(fileId: string): Promise<void> {
    const uploaded = await this.uploadedFileRepository.findById(fileId);
    if (!uploaded || uploaded.isLinked()) {
      return;
    }
    uploaded.link();
    await this.uploadedFileRepository.save(uploaded);
  }

  async deleteStorageFile(storageKey: string): Promise<void> {
    await this.fileStoragePort.deleteFile(storageKey);
  }
}
