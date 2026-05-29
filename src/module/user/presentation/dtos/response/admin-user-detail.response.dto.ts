import { ApiProperty } from '@nestjs/swagger';

export class AdminUserDetailResponseDto {
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

  @ApiProperty({ description: '가입일시' })
  createdAt: Date;

  @ApiProperty({ description: '수정일시' })
  updatedAt: Date;

  @ApiProperty({
    type: Date,
    nullable: true,
    description: '탈퇴일시 (탈퇴하지 않은 경우 null)',
  })
  deletedAt: Date | null;
}
