import { BaseException } from './base.exception';
import { ErrorCategory } from './error-category';

/**
 * 엔티티를 찾을 수 없을 때 (→ 404)
 * @example throw new EntityNotFoundException({ entityName: 'User', id, errorCode: 'USER_NOT_FOUND' })
 */
export class EntityNotFoundException extends BaseException {
  constructor({
    id,
    errorCode,
    entityName,
  }: {
    id?: string | number;
    errorCode?: string;
    entityName: string;
  }) {
    super({
      category: ErrorCategory.NOT_FOUND,
      code: errorCode?.toUpperCase() || 'ENTITY_NOT_FOUND',
      message: `${entityName}${id ? ` ID ${id}` : ''} 항목을 찾을 수 없습니다`,
    });
  }
}

/**
 * 상태/불변식 규칙 위반 (→ 422)
 *
 * **값 검증(400)이 아니라 "값은 멀쩡한데 상태/맥락이 안 되는" 경우.**
 * (예: 이미 활성화된 사용자 재활성, 확정된 파일 재확정)
 * 단건이며 `errors[]`로 수집하지 않는다.
 *
 * @example throw new DomainRuleViolationException({ entityName: 'User', reason: '...', errorCode: 'USER_ALREADY_ACTIVATED' })
 */
export class DomainRuleViolationException extends BaseException {
  constructor({
    entityName,
    reason,
    errorCode,
  }: {
    entityName: string;
    reason: string;
    errorCode?: string;
  }) {
    super({
      category: ErrorCategory.RULE_VIOLATION,
      code: errorCode?.toUpperCase() || 'DOMAIN_RULE_VIOLATION',
      message: `${entityName} 도메인 규칙 위반: ${reason}`,
    });
  }
}

/**
 * 중복 엔티티 (→ 409)
 * @example throw new DuplicateEntityException({ entityName: 'User', identifier, errorCode: 'EMAIL_ALREADY_EXISTS' })
 */
export class DuplicateEntityException extends BaseException {
  constructor({
    entityName,
    identifier,
    errorCode,
  }: {
    entityName: string;
    identifier?: string | number;
    errorCode?: string;
  }) {
    super({
      category: ErrorCategory.CONFLICT,
      code: errorCode?.toUpperCase() || 'DUPLICATE_ENTITY',
      message: `이미 존재하는 ${entityName}${identifier ? ` (${identifier})` : ''} 입니다`,
    });
  }
}

/**
 * 동시성 충돌(낙관적 락 등)로 업데이트 실패 (→ 409)
 *
 * `retry.util`이 `instanceof`로 감지해 재시도하므로 **별도 클래스로 유지**한다.
 * @example throw new ConcurrentUpdateException({ entityName: 'Account' })
 */
export class ConcurrentUpdateException extends BaseException {
  constructor({
    entityName,
    errorCode,
  }: {
    entityName: string;
    errorCode?: string;
  }) {
    super({
      category: ErrorCategory.CONFLICT,
      code: errorCode?.toUpperCase() || 'CONCURRENT_UPDATE',
      message: `${entityName} 동시성 충돌로 업데이트에 실패했습니다`,
    });
  }
}

/**
 * 값 검증 실패 — **단건** (→ 400)
 *
 * VO 검증·입력 파이프 등 "이 값이 규칙 위반"인 경우. **fail-fast 단건**으로,
 * 응답은 `code`(어긴 규칙) + `detail`(사람 메시지)이며 `errors[]`는 동반하지
 * 않는다. (요청 바디 다건 검증은 DTO 측 `RequestValidationException`이 담당)
 *
 * `code`는 필드+규칙을 식별하므로 구체적으로 짓는다(예: `LOGIN_ID_TOO_LONG`,
 * `INVALID_EMAIL_FORMAT`).
 *
 * @example throw new ValueObjectValidationException({ code: 'PASSWORD_TOO_SHORT', detail: '비밀번호는 8자 이상이어야 합니다' })
 */
export class ValueObjectValidationException extends BaseException {
  constructor({ code, detail }: { code: string; detail: string }) {
    super({
      category: ErrorCategory.VALIDATION,
      code: code.toUpperCase(),
      message: detail,
    });
  }
}

/**
 * 인증 실패 (→ 401)
 *
 * 도메인·서비스·가드 어디서 발생하든 의미가 같으므로 단일 예외로 다룬다.
 *
 * @example throw new AuthenticationException({ message: '...', errorCode: 'INVALID_CREDENTIALS' })
 */
export class AuthenticationException extends BaseException {
  constructor({ message, errorCode }: { message: string; errorCode?: string }) {
    super({
      category: ErrorCategory.UNAUTHENTICATED,
      code: errorCode?.toUpperCase() || 'UNAUTHORIZED',
      message,
    });
  }
}

/**
 * 권한 부족 (→ 403)
 * @example throw new AuthorizationException({ message: '...', errorCode: 'FORBIDDEN_ADMIN_ROLE' })
 */
export class AuthorizationException extends BaseException {
  constructor({ message, errorCode }: { message: string; errorCode?: string }) {
    super({
      category: ErrorCategory.FORBIDDEN,
      code: errorCode?.toUpperCase() || 'FORBIDDEN',
      message,
    });
  }
}

/**
 * 내부 서버 오류 (→ 500)
 *
 * **클라이언트가 손쓸 수 없는 서버측 실패**(토큰 서명 실패, JWT 인프라 오류 등).
 * 인증 실패(401)와 구분한다 — 자격증명 문제가 아니라 **서버 처리 실패**다.
 *
 * @example throw new InternalException({ message: '...', errorCode: 'TOKEN_CREATION_FAILED' })
 */
export class InternalException extends BaseException {
  constructor({ message, errorCode }: { message: string; errorCode?: string }) {
    super({
      category: ErrorCategory.INTERNAL,
      code: errorCode?.toUpperCase() || 'INTERNAL_SERVER_ERROR',
      message,
    });
  }
}
