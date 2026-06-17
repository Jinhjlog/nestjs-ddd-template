import { ApiProperty } from '@nestjs/swagger';

/**
 * 관리자 커맨드(생성/수정) 응답 DTO.
 *
 * 출처 = 애그리거트 `toPrimitives()`(AdminPrimitives). 쿼리 상세(`AdminDetailResponseDto`,
 * 출처 = ReadModel)와 **완전 분리**한다 — 모양이 같아도 공유/상속하지 않는다.
 * (출처·능력이 달라 요구사항 변경 시 한쪽 파급을 막기 위함. CQRS상 Command 자원과
 * Read Model 자원은 1:1이 아니다. `api-response.md §8`·`conventions §3`)
 */
export class AdminCommandResponseDto {
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
