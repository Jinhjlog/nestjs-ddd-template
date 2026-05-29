import { ApiProperty } from '@nestjs/swagger';

export class AdminDetailResponseDto {
  @ApiProperty({
    type: String,
    description: '관리자 ID (ULID)',
    example: '01HXK3G5N7MZQR8BVWEY6JKFP4',
  })
  id: string;

  @ApiProperty({
    type: String,
    description: '로그인 아이디',
    example: 'admin01',
  })
  loginId: string;

  @ApiProperty({
    type: String,
    description: '이름',
    example: '홍길동',
  })
  name: string;

  @ApiProperty({
    type: String,
    nullable: true,
    description: '이메일 (없으면 null)',
    example: 'admin@example.com',
  })
  email: string | null;

  @ApiProperty({
    type: String,
    description: '관리자 역할',
    enum: ['SUPER_ADMIN', 'ADMIN'],
    example: 'ADMIN',
  })
  role: string;

  @ApiProperty({
    type: Boolean,
    description: '활성 상태',
    example: true,
  })
  isActive: boolean;

  @ApiProperty({
    type: Date,
    nullable: true,
    description: '마지막 로그인 일시 (없으면 null)',
    example: '2024-06-01T00:00:00.000Z',
  })
  lastLoginAt: Date | null;

  @ApiProperty({
    type: Date,
    description: '생성일시',
    example: '2024-01-01T00:00:00.000Z',
  })
  createdAt: Date;

  @ApiProperty({
    type: Date,
    description: '수정일시',
    example: '2024-01-01T00:00:00.000Z',
  })
  updatedAt: Date;
}
