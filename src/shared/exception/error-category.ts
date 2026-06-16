/**
 * 에러 카테고리 (전송 계층 무관)
 *
 * 도메인/애플리케이션 예외는 이 카테고리만 보유하며 HTTP를 알지 못한다.
 * 카테고리 → HTTP 상태코드 매핑은 어댑터(예외 필터)에서만 수행한다.
 */
export enum ErrorCategory {
  /** 입력/값 검증 실패 → 400 */
  VALIDATION = 'VALIDATION',
  /** 인증 실패(미인증) → 401 */
  UNAUTHENTICATED = 'UNAUTHENTICATED',
  /** 권한 부족 → 403 */
  FORBIDDEN = 'FORBIDDEN',
  /** 리소스 없음 → 404 */
  NOT_FOUND = 'NOT_FOUND',
  /** 충돌(중복·동시성) → 409 */
  CONFLICT = 'CONFLICT',
  /** 비즈니스 규칙 위반 → 422 */
  RULE_VIOLATION = 'RULE_VIOLATION',
  /** 내부 오류 → 500 */
  INTERNAL = 'INTERNAL',
  /** 외부 의존 불가 → 503 */
  UNAVAILABLE = 'UNAVAILABLE',
}
