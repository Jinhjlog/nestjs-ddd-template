import { Injectable, PipeTransform } from '@nestjs/common';
import { ValueObjectValidationException } from '@shared/exception';

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
      throw new ValueObjectValidationException({
        code: 'FILE_REQUIRED',
        detail: '이미지 파일을 선택해주세요',
      });
    }

    this.validateFileSize(value);
    this.validateFileExtension(value);
    this.validateMimeType(value);

    return value;
  }

  private validateFileSize(file: Express.Multer.File): void {
    if (file.size > this.MAX_FILE_SIZE) {
      throw new ValueObjectValidationException({
        code: 'FILE_SIZE_EXCEEDED',
        detail: `파일 크기가 ${this.MAX_FILE_SIZE / 1024 / 1024}MB를 초과합니다`,
      });
    }
  }

  private validateFileExtension(file: Express.Multer.File): void {
    const ext = '.' + file.originalname.split('.').pop()?.toLowerCase();
    if (!this.ALLOWED_EXTENSIONS.includes(ext)) {
      throw new ValueObjectValidationException({
        code: 'INVALID_FILE_EXTENSION',
        detail: `허용되지 않는 파일 형식입니다. 허용: ${this.ALLOWED_EXTENSIONS.join(', ')}`,
      });
    }
  }

  private validateMimeType(file: Express.Multer.File): void {
    if (!this.ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      throw new ValueObjectValidationException({
        code: 'INVALID_MIME_TYPE',
        detail: '이미지 파일 형식이 아닙니다',
      });
    }
  }
}
