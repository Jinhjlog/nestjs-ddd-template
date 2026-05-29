import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsNumber } from 'class-validator';

export class RequestUploadRequestDto {
  @ApiProperty({
    type: String,
    description: '원본 파일명',
    example: 'document.pdf',
  })
  @IsString()
  @IsNotEmpty()
  fileName: string;

  @ApiProperty({
    type: String,
    description: 'MIME 타입',
    example: 'application/pdf',
  })
  @IsString()
  @IsNotEmpty()
  mimeType: string;

  @ApiProperty({
    type: Number,
    description: '파일 크기 (바이트)',
    example: 1048576,
  })
  @IsNumber()
  fileSize: number;

  @ApiProperty({
    type: String,
    description: '업로드 용도 (profile-image, attachment, editor-content)',
    example: 'attachment',
  })
  @IsString()
  @IsNotEmpty()
  purpose: string;
}
