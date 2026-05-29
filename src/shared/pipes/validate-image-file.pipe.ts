import { Injectable, PipeTransform } from '@nestjs/common';
import { ValidationFailedException } from '@shared/exception';

@Injectable()
export class ValidateImageFilePipe implements PipeTransform {
  private readonly MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
  private readonly ALLOWED_EXTENSIONS = [
    '.jpg',
    '.jpeg',
    '.png',
    '.gif',
    '.webp',
  ];
  private readonly ALLOWED_MIME_TYPES = [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
  ];

  transform(value: Express.Multer.File | undefined): Express.Multer.File {
    if (!value) {
      throw new ValidationFailedException({
        field: 'file',
        reason: '이미지 파일을 선택해주세요',
        errorCode: 'FILE_REQUIRED',
      });
    }

    this.validateFileSize(value);
    this.validateFileExtension(value);
    this.validateMimeType(value);

    return value;
  }

  private validateFileSize(file: Express.Multer.File): void {
    if (file.size > this.MAX_FILE_SIZE) {
      throw new ValidationFailedException({
        field: 'file',
        reason: `파일 크기가 ${this.MAX_FILE_SIZE / 1024 / 1024}MB를 초과합니다`,
        errorCode: 'FILE_SIZE_EXCEEDED',
      });
    }
  }

  private validateFileExtension(file: Express.Multer.File): void {
    const ext = '.' + file.originalname.split('.').pop()?.toLowerCase();
    if (!this.ALLOWED_EXTENSIONS.includes(ext)) {
      throw new ValidationFailedException({
        field: 'file',
        reason: `허용되지 않는 파일 형식입니다. 허용: ${this.ALLOWED_EXTENSIONS.join(', ')}`,
        errorCode: 'INVALID_FILE_EXTENSION',
      });
    }
  }

  private validateMimeType(file: Express.Multer.File): void {
    if (!this.ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      throw new ValidationFailedException({
        field: 'file',
        reason: '이미지 파일 형식이 아닙니다',
        errorCode: 'INVALID_MIME_TYPE',
      });
    }
  }
}
