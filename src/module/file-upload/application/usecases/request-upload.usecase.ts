import { Injectable } from '@nestjs/common';
import { BoundedString } from '@lib/domain';
import { DomainRuleViolationException } from '@shared/exception';
import { UploadedFile, getUploadPolicy } from '../../domain/models';
import { UploadedFileRepository } from '../../domain/repositories';
import { FileStoragePort } from '../ports';
import { RequestUploadDto, RequestUploadResult } from '../dtos';

@Injectable()
export class RequestUploadUseCase {
  constructor(
    private readonly uploadedFileRepository: UploadedFileRepository,
    private readonly fileStoragePort: FileStoragePort,
  ) {}

  async execute(dto: RequestUploadDto): Promise<RequestUploadResult> {
    // 1. DTO → Value Object 변환 및 검증
    const originalName = BoundedString.create(dto.fileName, {
      fieldName: 'originalName',
      maxLength: 255,
    });

    // 2. 용도별 업로드 정책 검증
    const policy = getUploadPolicy(dto.purpose);

    if (!policy) {
      throw new DomainRuleViolationException({
        entityName: 'UploadedFile',
        reason: `지원하지 않는 업로드 용도입니다: ${dto.purpose}`,
        errorCode: 'UNSUPPORTED_PURPOSE',
      });
    }

    if (!policy.allowedMimeTypes.includes(dto.mimeType)) {
      throw new DomainRuleViolationException({
        entityName: 'UploadedFile',
        reason: `허용되지 않는 파일 형식입니다: ${dto.mimeType}`,
        errorCode: 'MIME_TYPE_NOT_ALLOWED',
      });
    }

    if (dto.fileSize > policy.maxFileSize) {
      throw new DomainRuleViolationException({
        entityName: 'UploadedFile',
        reason: `파일 크기가 제한을 초과합니다. 최대: ${policy.maxFileSize} bytes`,
        errorCode: 'FILE_SIZE_EXCEEDED',
      });
    }

    // 3. 도메인 엔티티 생성 (PENDING 상태, 스토리지 키 자동 생성)
    const uploadedFile = UploadedFile.create({
      originalName,
      mimeType: dto.mimeType,
      purpose: dto.purpose,
      uploadedBy: dto.uploadedBy,
    });

    // 4. Presigned URL 발급
    const expiresInSeconds = Math.floor(
      (uploadedFile.expiresAt.getTime() - Date.now()) / 1000,
    );

    const urlResult = await this.fileStoragePort.generateUploadUrl({
      storageKey: uploadedFile.storageKey,
      mimeType: dto.mimeType,
      maxFileSize: policy.maxFileSize,
      expiresInSeconds,
    });

    // 5. 저장
    await this.uploadedFileRepository.save(uploadedFile);

    // 6. 결과 반환
    return {
      fileId: uploadedFile.id.toString(),
      uploadUrl: urlResult.uploadUrl,
      method: urlResult.method,
      headers: urlResult.headers,
    };
  }
}
