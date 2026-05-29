import { Injectable } from '@nestjs/common';
import {
  DomainRuleViolationException,
  EntityNotFoundException,
} from '@shared/exception';
import { isAutoLinkPurpose } from '../../domain/models/uploaded-file/upload-policy';
import { UploadedFileRepository } from '../../domain/repositories';
import { FileStoragePort } from '../ports';
import { ConfirmUploadDto, ConfirmUploadResult } from '../dtos';

@Injectable()
export class ConfirmUploadUseCase {
  constructor(
    private readonly uploadedFileRepository: UploadedFileRepository,
    private readonly fileStoragePort: FileStoragePort,
  ) {}

  async execute(dto: ConfirmUploadDto): Promise<ConfirmUploadResult> {
    // 1. 파일 레코드 조회
    const entity = await this.uploadedFileRepository.findById(dto.fileId);

    if (!entity) {
      throw new EntityNotFoundException({
        entityName: 'UploadedFile',
        errorCode: 'FILE_NOT_FOUND',
      });
    }

    // 2. 스토리지에서 실제 파일 존재 여부 확인
    const metadata = await this.fileStoragePort.getFileMetadata(
      entity.storageKey,
    );

    if (!metadata) {
      throw new DomainRuleViolationException({
        entityName: 'UploadedFile',
        reason: '스토리지에 파일이 존재하지 않습니다.',
        errorCode: 'FILE_NOT_UPLOADED',
      });
    }

    // 3. 도메인 모델에서 상태 전환 (PENDING → CONFIRMED)
    entity.confirm(metadata.fileSize);

    // 4. 에디터 인라인 이미지 등 자동 링크 대상이면 즉시 link 처리
    if (isAutoLinkPurpose(entity.purpose)) {
      entity.link();
    }

    // 5. 저장
    await this.uploadedFileRepository.save(entity);

    // 6. 결과 반환
    const fileUrl = this.fileStoragePort.getServingUrl(entity.storageKey);
    return { fileId: entity.id.toString(), fileUrl };
  }
}
