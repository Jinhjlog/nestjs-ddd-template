import { HttpStatus } from '@nestjs/common';
import { BaseException, BaseExceptionType } from './base.exception';

export class PresentationException extends BaseException {
  constructor({ statusCode, errorCode, message }: BaseExceptionType) {
    super({ statusCode, errorCode, message });
  }
}

/**
 * AuthorizationException
 * 권한이 부족하여 접근이 거부되는 경우 발생하는 예외 (403 Forbidden)
 *
 * @example
 * // 관리자 권한이 필요한 리소스에 일반 사용자가 접근한 경우
 * throw new AuthorizationException({
 *   message: '접근 권한이 없습니다',
 *   errorCode: 'INSUFFICIENT_PERMISSIONS'
 * });
 *
 * @param message 에러 메시지
 * @param errorCode 에러 코드 (선택적)
 */
export class AuthorizationException extends PresentationException {
  constructor({
    message,
    errorCode,
  }: Pick<BaseExceptionType, 'message' | 'errorCode'>) {
    super({
      statusCode: HttpStatus.FORBIDDEN,
      errorCode: errorCode?.toUpperCase() || 'FORBIDDEN',
      message,
    });
  }
}

/**
 * AuthenticationException
 * 인증 과정에서 발생하는 예외 (401 Unauthorized)
 *
 * @example
 * // 토큰이 만료된 경우
 * throw new AuthenticationException('토큰이 만료되었습니다', TOKEN_EXPIRED);
 *
 * @param message 에러 메세지
 * @param errorCode 에러 코드 (선택적)
 */
export class AuthenticationException extends PresentationException {
  constructor({
    message,
    errorCode,
  }: Pick<BaseExceptionType, 'message' | 'errorCode'>) {
    super({
      statusCode: HttpStatus.UNAUTHORIZED,
      errorCode: errorCode?.toUpperCase() || 'UNAUTHORIZED',
      message,
    });
  }
}

/**
 * ValidationFailedException
 * 유효성 검사 실패 시 발생하는 예외
 *
 * @example
 * // 잘못된 이메일 형식
 * throw new ValidationFailedException({
 *   field: 'email',
 *   reason: '유효한 이메일 형식이 아닙니다'
 * });
 *
 * @param field 유효성 검사가 실패한 필드 이름
 * @param reason 유효성 검사 실패 사유
 * @param errorCode 예외 코드 (기본값: 'VALIDATION_FAILED')
 */
export class ValidationFailedException extends PresentationException {
  constructor({
    field,
    reason,
    errorCode,
  }: {
    field: string;
    reason: string;
    errorCode?: string;
  }) {
    super({
      statusCode: HttpStatus.BAD_REQUEST,
      errorCode: errorCode?.toUpperCase() || 'VALIDATION_FAILED',
      message: `${field}: ${reason}`,
    });
  }
}
