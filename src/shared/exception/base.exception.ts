import { ErrorCategory } from './error-category';

/** 필드 단위 검증 오류 (RFC 9457 `errors` 확장 멤버) */
export interface FieldError {
  /** 필드 경로 (중첩은 `address.city`) */
  name: string;
  /** 필드별 머신 코드 (예: REQUIRED, INVALID_TYPE) */
  code: string;
  /** 사람용 상세 메시지 */
  detail: string;
}

export type BaseExceptionParams = {
  category: ErrorCategory;
  code: string;
  message: string;
  errors?: FieldError[];
};

/**
 * 모든 애플리케이션 예외의 기반.
 *
 * **HTTP를 알지 못한다** — `category`만 보유하고, HTTP 상태코드 매핑은
 * 어댑터(예외 필터)에서만 수행한다. (Clean Architecture: 도메인은 전송 무관)
 */
export class BaseException extends Error {
  readonly category: ErrorCategory;
  /** 클라이언트 분기용 머신 코드 (SCREAMING_SNAKE_CASE) */
  readonly code: string;
  /** 필드 검증 오류 (요청 바디 검증 시에만) */
  readonly errors?: FieldError[];

  constructor({ category, code, message, errors }: BaseExceptionParams) {
    super(message);
    this.name = new.target.name;
    this.category = category;
    this.code = code;
    this.errors = errors;
  }
}
