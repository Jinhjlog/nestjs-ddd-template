import { applyDecorators } from '@nestjs/common';
import { STATUS_CODES } from 'http';
import { ApiExtraModels, ApiResponse, getSchemaPath } from '@nestjs/swagger';
import { ProblemDetailsDto } from './problem-details.dto';

/** Swagger media-type 예시 항목 */
type ProblemExample = { summary: string; value: Record<string, unknown> };

/** 모든 상태코드 공통 봉투 (RFC 9457 표준 멤버 + 확장) */
function baseExample(status: number): Record<string, unknown> {
  return {
    type: 'about:blank',
    title: STATUS_CODES[status] ?? 'Error',
    status,
    instance: '/api/v1/...',
    requestId: '9f1c2a7e-3b6d-4c1a-8f2e-1a2b3c4d5e6f',
    timestamp: '2026-06-16T03:12:00.000Z',
  };
}

/** 상태코드별 대표 code/detail (illustrative — 실제 code는 description에 명시) */
const SINGLE_PROBLEM: Record<number, { code: string; detail: string }> = {
  401: { code: 'UNAUTHENTICATED', detail: '인증에 실패했습니다.' },
  403: { code: 'FORBIDDEN', detail: '접근 권한이 없습니다.' },
  404: { code: 'NOT_FOUND', detail: '대상을 찾을 수 없습니다.' },
  409: { code: 'CONFLICT', detail: '리소스가 충돌합니다.' },
  422: { code: 'RULE_VIOLATION', detail: '비즈니스 규칙을 위반했습니다.' },
  503: {
    code: 'SERVICE_UNAVAILABLE',
    detail: '일시적으로 서비스를 사용할 수 없습니다.',
  },
};

/**
 * 상태코드별 Example 집합 (Swagger UI 드롭다운).
 *
 * 400은 두 형태가 공존하므로 **예시를 2개** 제공한다:
 * - `fieldValidation` — 요청 바디(DTO) 검증 실패: `VALIDATION_FAILED` + `errors[]` 다건
 * - `singleRule` — VO/도메인 단건 검증: 구체 `code`, `errors` 없음
 *
 * 그 외 상태는 단건 예시 1개. **실제 `code`는 엔드포인트마다 다르며 응답
 * `description`에 구체적으로 명시**된다(예시의 code/detail은 illustrative).
 */
function problemExamples(status: number): Record<string, ProblemExample> {
  const base = baseExample(status);

  if (status === 400) {
    return {
      fieldValidation: {
        summary: '요청 형식 검증 실패 — DTO 타입가드 다건 (errors[])',
        value: {
          ...base,
          detail: '요청 검증에 실패했습니다.',
          code: 'VALIDATION_FAILED',
          // class-validator 타입가드(@IsNotEmpty/@IsString 등) 실패만 여기에 모인다.
          // 길이·형식·범위 같은 "값 규칙"은 VO 단건(아래 singleValue)으로 나간다.
          errors: [
            {
              name: 'loginId',
              code: 'REQUIRED',
              detail: 'loginId should not be empty',
            },
            {
              name: 'password',
              code: 'INVALID_TYPE',
              detail: 'password must be a string',
            },
          ],
        },
      },
      singleValue: {
        summary: '값 검증 실패 — VO 단건 (구체 code, errors 없음)',
        value: {
          ...base,
          detail: '비밀번호는 8자 이상이어야 합니다',
          code: 'PASSWORD_TOO_SHORT',
        },
      },
    };
  }

  const picked = SINGLE_PROBLEM[status] ?? {
    code: 'INTERNAL_SERVER_ERROR',
    detail: '예상치 못한 오류가 발생했습니다.',
  };

  return {
    default: {
      summary: STATUS_CODES[status] ?? 'Error',
      value: { ...base, detail: picked.detail, code: picked.code },
    },
  };
}

/**
 * 에러 응답(RFC 9457 problem+json) Swagger 데코레이터.
 *
 * 본문 스키마는 항상 `ProblemDetailsDto`($ref 공유). Example은 상태코드에
 * 맞춰 생성되며, **400은 필드검증/단건 두 예시를 드롭다운으로** 제공한다.
 * `description`에는 발생 가능한 구체 에러 코드를 나열한다.
 *
 * @example
 * @ApiProblemResponse(HttpStatus.NOT_FOUND, '회원을 찾을 수 없음: _**USER_NOT_FOUND**_')
 */
export function ApiProblemResponse(status: number, description: string) {
  return applyDecorators(
    ApiExtraModels(ProblemDetailsDto),
    ApiResponse({
      status,
      description,
      content: {
        'application/json': {
          schema: { $ref: getSchemaPath(ProblemDetailsDto) },
          examples: problemExamples(status),
        },
      },
    }),
  );
}
