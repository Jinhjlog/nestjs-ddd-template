import type { Response } from 'supertest';

/**
 * AllExceptionsFilter가 반환하는 RFC 9457 problem+json 에러 응답 구조.
 *
 * @see src/shared/exception/exception.filter.ts
 */
export interface ErrorResponseBody {
  type: string;
  title: string;
  status: number;
  detail: string;
  instance: string;
  /** 클라 분기키 (SCREAMING_SNAKE_CASE) */
  code: string;
  /** 요청 바디(DTO) 검증 실패 시에만 — 필드별 다건 */
  errors?: { name: string; code: string; detail: string }[];
  requestId: string;
  timestamp: string;
}

/**
 * E2E 에러 응답을 검증합니다.
 *
 * @example
 * expectError(response, {
 *   statusCode: 401,
 *   errorCode: 'INVALID_CREDENTIALS',
 * });
 */
export function expectError(
  response: Response,
  expected: {
    statusCode: number;
    errorCode: string;
    message?: string;
  },
): void {
  const body = response.body as ErrorResponseBody;

  expect(response.status).toBe(expected.statusCode);
  expect(body.code).toBe(expected.errorCode);

  if (expected.message) {
    expect(body.detail).toBe(expected.message);
  }
}

/**
 * 성공 응답의 상태 코드를 검증하고 타입이 지정된 body를 반환합니다.
 *
 * @example
 * const body = expectSuccess<{ accessToken: string }>(response, 200);
 * expect(body.accessToken).toBeDefined();
 */
export function expectSuccess<T>(response: Response, statusCode: number): T {
  expect(response.status).toBe(statusCode);
  return response.body as T;
}
