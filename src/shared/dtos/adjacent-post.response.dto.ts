import { ApiProperty } from '@nestjs/swagger';

export class AdjacentPostResponseDto {
  @ApiProperty({
    type: String,
    description: '게시글 ID (ULID)',
    example: '01HXK3G5N7MZQR8BVWEY6JKFP4',
  })
  id: string;

  @ApiProperty({
    type: String,
    description: '제목',
    example: '게시글 제목',
  })
  title: string;
}
