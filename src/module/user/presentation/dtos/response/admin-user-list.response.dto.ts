import { ApiProperty } from '@nestjs/swagger';

export class AdminUserListItemResponseDto {
  @ApiProperty({
    description: '사용자 ID (ULID)',
    example: '01HXK3G5N7MZQR8BVWEY6JKFP4',
  })
  id: string;

  @ApiProperty({
    type: String,
    nullable: true,
    description: '이름',
    example: '홍길동',
  })
  name: string | null;

  @ApiProperty({ description: '이메일', example: 'user@example.com' })
  email: string;

  @ApiProperty({
    type: String,
    nullable: true,
    description: '전화번호',
    example: '01012345678',
  })
  phone: string | null;

  @ApiProperty({ description: '활성 상태', example: true })
  isActive: boolean;

  @ApiProperty({ description: '가입일시', example: '2024-01-01T00:00:00.000Z' })
  createdAt: Date;
}

export class AdminUserListResponseDto {
  @ApiProperty({
    description: '회원 목록',
    type: [AdminUserListItemResponseDto],
  })
  items: AdminUserListItemResponseDto[];

  @ApiProperty({ description: '전체 회원 수', example: 150 })
  totalCount: number;

  @ApiProperty({ description: '전체 페이지 수', example: 8 })
  totalPages: number;

  @ApiProperty({ description: '현재 페이지 번호', example: 1 })
  currentPage: number;
}
