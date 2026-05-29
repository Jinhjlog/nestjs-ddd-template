import { HttpStatus } from '@nestjs/common';
import { BaseException, BaseExceptionType } from './base.exception';

export class DomainException extends BaseException {
  constructor({ statusCode, errorCode, message }: BaseExceptionType) {
    super({ statusCode, errorCode, message });
  }
}

/**
 * EntityNotFoundException
 * 데이터베이스나 저장소에서 특정 엔티티를 찾을 수 없을 때 발생하는 예외
 *
 * @example
 * // Banner ID 123을 찾을 수 없는 경우
 * throw new EntityNotFoundException('Banner', 123);
 * // "Banner ID 123 항목을 찾을 수 없습니다" 메시지 출력
 *
 * @param id 찾을 수 없는 엔티티의 식별자
 * @param errorCode 예외 코드 (기본값: 'ENTITY_NOT_FOUND')
 * @param entityName 엔티티의 이름
 */
export class EntityNotFoundException extends DomainException {
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
      statusCode: HttpStatus.NOT_FOUND,
      errorCode: errorCode?.toUpperCase() || 'ENTITY_NOT_FOUND',
      message: `${entityName}${id ? ` ID ${id}` : ''} 항목을 찾을 수 없습니다`,
    });
  }
}

/**
 * DomainRuleViolationException
 * 도메인 규칙을 위반했을 때 발생하는 예외
 *
 * @example
 * // 이미 취소된 주문을 다시 취소하려는 경우
 * throw DomainRuleViolationException('Order', '이미 취소된 주문은 다시 취소할 수 없습니다');
 *
 * @param entityName 규칙 위반이 발생한 엔티티의 이름
 * @param reason 규칙 위반 사유
 * @param errorCode 예외 코드 (기본값: 'DOMAIN_RULE_VIOLATION')
 */
export class DomainRuleViolationException extends DomainException {
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
      statusCode: HttpStatus.BAD_REQUEST,
      errorCode: errorCode?.toUpperCase() || 'DOMAIN_RULE_VIOLATION',
      message: `${entityName} 도메인 규칙 위반: ${reason}`,
    });
  }
}

/**
 * DuplicateEntityException
 * 중복된 엔티티를 추가하려고 할 때 발생하는 예외
 *
 * @example
 * // 그룹 멤버 중복 시
 * throw new DuplicateEntityException({
 *   entityName: '그룹 멤버',
 *   identifier: 'user123'
 * });
 *
 * @param entityName 중복된 엔티티의 이름
 * @param identifier 중복된 식별자 (선택적)
 * @param errorCode 예외 코드 (기본값: 'DUPLICATE_ENTITY')
 */
export class DuplicateEntityException extends DomainException {
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
      statusCode: HttpStatus.CONFLICT,
      errorCode: errorCode?.toUpperCase() || 'DUPLICATE_ENTITY',
      message: `이미 존재하는 ${entityName}${identifier ? ` (${identifier})` : ''} 입니다`,
    });
  }
}

/**
 * ValueObjectValidationException
 * 값 객체의 유효성 검증에 실패했을 때 발생하는 예외
 *
 * @example
 * // 이메일 형식이 맞지 않는 경우
 * throw new ValueObjectValidationException({
 *   entityName: 'User',
 *   reason: '이메일 형식이 올바르지 않습니다'
 * });
 *
 * @param entityName 엔티티 이름
 * @param reason 유효성 검증 실패 이유
 * @param errorCode 예외 코드 (기본값: 'VALIDATION_FAILED')
 */
export class ValueObjectValidationException extends DomainException {
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
      statusCode: HttpStatus.BAD_REQUEST,
      errorCode: errorCode?.toUpperCase() || 'VALIDATION_FAILED',
      message: `${entityName} 유효성 검증 실패: ${reason}`,
    });
  }
}

/**
 * DomainAuthenticationException
 * 인증 과정에서 발생하는 도메인 예외
 *
 * @example
 * // 리프레시 토큰이 유효하지 않은 경우
 * throw DomainAuthenticationException('리프레시 토큰이 유효하지 않습니다', 'INVALID_REFRESH_TOKEN');
 *
 * @param message 에러 메시지
 * @param errorCode 에러 코드 (선택적)
 */
export class DomainAuthenticationException extends DomainException {
  constructor({ errorCode, message }: { errorCode?: string; message: string }) {
    super({
      statusCode: HttpStatus.UNAUTHORIZED,
      errorCode: errorCode?.toUpperCase() || 'DOMAIN_AUTHENTICATION_FAILED',
      message,
    });
  }
}
