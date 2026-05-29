import { ApiProperty } from '@nestjs/swagger';

export class ConfirmUploadResponseDto {
  @ApiProperty({
    type: String,
    description: '파일 ID',
    example: '01JNQVG0R1FILE00000000001',
  })
  fileId: string;

  @ApiProperty({
    type: String,
    description: '파일 접근 URL',
    example: 'http://localhost:3001/uploads/popup/2026-03/01JNQ...',
  })
  fileUrl: string;
}
