import { ApiProperty } from '@nestjs/swagger';

export class RequestUploadResponseDto {
  @ApiProperty({
    type: String,
    description: '파일 ID',
    example: '01JNQVG0R1FILE00000000001',
  })
  fileId: string;

  @ApiProperty({
    type: String,
    description: '업로드 URL',
    example: 'http://localhost:3000/uploads/notice/2026-03/01ABC.pdf',
  })
  uploadUrl: string;

  @ApiProperty({
    type: String,
    description: 'HTTP 메서드',
    enum: ['PUT', 'POST'],
    example: 'PUT',
  })
  method: string;

  @ApiProperty({
    type: Object,
    description: '업로드 시 필요한 HTTP 헤더',
    example: { 'Content-Type': 'application/pdf' },
    nullable: true,
  })
  headers?: Record<string, string>;
}
