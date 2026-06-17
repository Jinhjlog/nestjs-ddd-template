import { ApiProperty } from '@nestjs/swagger';

/**
 * 회원 커맨드(활성/비활성 등) 응답 DTO.
 *
 * 출처 = 애그리거트 `toPrimitives()`(UserPrimitives). 쿼리 상세(`AdminUserDetailResponseDto`,
 * 출처 = ReadModel)와 **완전 분리**한다 — 모양이 같아도 공유/상속하지 않는다.
 * (출처·능력이 달라 요구사항 변경 시 한쪽 파급을 막기 위함. CQRS상 Command 자원과
 * Read Model 자원은 1:1이 아니다. `api-response.md §8`·`conventions §3`)
 */
export class AdminUserCommandResponseDto {
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
