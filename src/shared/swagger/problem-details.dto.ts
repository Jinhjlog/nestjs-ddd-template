import { ApiProperty } from '@nestjs/swagger';

/** RFC 9457 `errors` 항목 — 필드 단위 검증 오류 */
export class ProblemFieldErrorDto {
  @ApiProperty({ description: '필드 경로 (중첩은 a.b)', example: 'email' })
  name: string;

  @ApiProperty({ description: '필드 머신 코드', example: 'INVALID_TYPE' })
  code: string;

  @ApiProperty({
    description: '사람용 상세 메시지',
    example: '이메일 형식이 올바르지 않습니다.',
  })
  detail: string;
}

/**
 * RFC 9457 Problem Details — 모든 에러 응답 본문 스키마.
 * Content-Type: `application/problem+json`
 */
export class ProblemDetailsDto {
  @ApiProperty({ description: '문제 종류 URI', example: 'about:blank' })
  type: string;

  @ApiProperty({
    description: 'HTTP 상태 문구 (사람용 요약)',
    example: 'Not Found',
  })
  title: string;

  @ApiProperty({ description: 'HTTP 상태코드', example: 404 })
  status: number;

  @ApiProperty({
    description: '이번 발생 건 상세 (사람용)',
    example: 'User ID 01HXK... 항목을 찾을 수 없습니다',
  })
  detail: string;

  @ApiProperty({
    description: '이 요청 경로',
    example: '/api/v1/admin/users/01HXK...',
  })
  instance: string;

  @ApiProperty({
    description: '클라이언트 분기용 머신 코드 (SCREAMING_SNAKE_CASE)',
    example: 'USER_NOT_FOUND',
  })
  code: string;

  @ApiProperty({
    description: '필드 검증 오류 (요청 바디 검증 시에만)',
    type: [ProblemFieldErrorDto],
    required: false,
  })
  errors?: ProblemFieldErrorDto[];

  @ApiProperty({ description: '요청 추적 ID', example: '9f1c2a7e-...' })
  requestId: string;

  @ApiProperty({
    description: '발생 시각 (ISO 8601)',
    example: '2026-06-16T03:12:00.000Z',
  })
  timestamp: string;
}
