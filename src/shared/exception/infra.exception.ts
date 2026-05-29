import { HttpStatus } from '@nestjs/common';
import { BaseException, BaseExceptionType } from './base.exception';

export class InfraException extends BaseException {
  constructor({ statusCode, errorCode, message }: BaseExceptionType) {
    super({ statusCode, errorCode, message });
  }
}

/**
 * DatabaseConnectionException
 * 데이터베이스 연결에 실패했을 때 발생하는 예외
 *
 * @example
 * // 데이터베이스 연결 실패 시
 * throw new DatabaseConnectionException({
 *   reason: '데이터베이스 서버에 연결할 수 없습니다'
 * });
 *
 * @param reason 연결 실패 사유
 * @param errorCode 예외 코드 (기본값: 'DATABASE_CONNECTION_FAILED')
 */
export class DatabaseConnectionException extends InfraException {
  constructor({ reason, errorCode }: { reason: string; errorCode?: string }) {
    super({
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      errorCode: errorCode?.toUpperCase() || 'DATABASE_CONNECTION_FAILED',
      message: `데이터베이스 연결 오류: ${reason}`,
    });
  }
}

/**
 * DatabaseConstraintViolationException
 * 데이터베이스 제약 조건(Constraint) 위반 시 발생하는 예외
 * (외래키 제약, 유니크 제약, NOT NULL 제약 등)
 *
 * @example
 * // 외래키 제약 위반 시
 * throw new DatabaseConstraintViolationException({
 *   constraint: 'fk_user_group',
 *   reason: '존재하지 않는 그룹에 사용자를 추가할 수 없습니다'
 * });
 *
 * @param constraint 위반된 제약 조건 이름
 * @param reason 제약 조건 위반 사유
 * @param errorCode 예외 코드 (기본값: 'DATABASE_CONSTRAINT_VIOLATION')
 */
export class DatabaseConstraintViolationException extends InfraException {
  constructor({
    constraint,
    reason,
    errorCode,
  }: {
    constraint?: string;
    reason: string;
    errorCode?: string;
  }) {
    super({
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      errorCode: errorCode?.toUpperCase() || 'DATABASE_CONSTRAINT_VIOLATION',
      message: `데이터베이스 제약 조건 위반${constraint ? ` (${constraint})` : ''}: ${reason}`,
    });
  }
}

/**
 * DatabaseTransactionException
 * 데이터베이스 트랜잭션 처리 중 오류가 발생했을 때 발생하는 예외
 *
 * @example
 * // 트랜잭션 커밋 실패 시
 * throw new DatabaseTransactionException({
 *   operation: 'commit',
 *   reason: '트랜잭션 커밋 중 네트워크 오류가 발생했습니다'
 * });
 *
 * @param operation 실패한 트랜잭션 작업 (예: 'commit', 'rollback', 'begin')
 * @param reason 트랜잭션 실패 사유
 * @param errorCode 예외 코드 (기본값: 'DATABASE_TRANSACTION_FAILED')
 */
export class DatabaseTransactionException extends InfraException {
  constructor({
    operation,
    reason,
    errorCode,
  }: {
    operation?: string;
    reason: string;
    errorCode?: string;
  }) {
    super({
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      errorCode: errorCode?.toUpperCase() || 'DATABASE_TRANSACTION_FAILED',
      message: `데이터베이스 트랜잭션 오류${operation ? ` (${operation})` : ''}: ${reason}`,
    });
  }
}

/**
 * DatabaseQueryException
 * 데이터베이스 쿼리 실행 중 오류가 발생했을 때 발생하는 예외
 *
 * @example
 * // 쿼리 실행 오류 시
 * throw new DatabaseQueryException({
 *   operation: 'findMany',
 *   reason: '쿼리 타임아웃이 발생했습니다'
 * });
 *
 * @param operation 실패한 쿼리 작업
 * @param reason 쿼리 실행 실패 사유
 * @param errorCode 예외 코드 (기본값: 'DATABASE_QUERY_FAILED')
 */
export class DatabaseQueryException extends InfraException {
  constructor({
    operation,
    reason,
    errorCode,
  }: {
    operation?: string;
    reason: string;
    errorCode?: string;
  }) {
    super({
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      errorCode: errorCode?.toUpperCase() || 'DATABASE_QUERY_FAILED',
      message: `데이터베이스 쿼리 오류${operation ? ` (${operation})` : ''}: ${reason}`,
    });
  }
}

/**
 * ExternalServiceException
 * 외부 서비스 연동 중 오류가 발생했을 때 발생하는 예외
 *
 * @example
 * // AWS S3 업로드 실패 시
 * throw new ExternalServiceException({
 *   serviceName: 'AWS S3',
 *   reason: '파일 업로드에 실패했습니다',
 *   errorCode: 'S3_UPLOAD_FAILED'
 * });
 *
 * @param serviceName 외부 서비스 이름
 * @param reason 연동 실패 사유
 * @param errorCode 예외 코드 (기본값: 'EXTERNAL_SERVICE_FAILED')
 * @param statusCode HTTP 상태 코드 (기본값: 502 Bad Gateway)
 */
export class ExternalServiceException extends InfraException {
  constructor({
    serviceName,
    reason,
    errorCode,
    statusCode,
  }: {
    serviceName: string;
    reason: string;
    errorCode?: string;
    statusCode?: number;
  }) {
    super({
      statusCode: statusCode || HttpStatus.BAD_GATEWAY,
      errorCode: errorCode?.toUpperCase() || 'EXTERNAL_SERVICE_FAILED',
      message: `외부 서비스 연동 오류 (${serviceName}): ${reason}`,
    });
  }
}

/**
 * DataIntegrityException
 * 데이터 정합성이 깨졌을 때 발생하는 예외
 * (예: 필수 데이터 누락, 데이터 불일치 등)
 *
 * @example
 * // 데이터 정합성 오류 시
 * throw new DataIntegrityException({
 *   entityName: 'User',
 *   reason: '사용자 프로필 정보가 누락되었습니다'
 * });
 *
 * @param entityName 정합성 문제가 발생한 엔티티 이름
 * @param reason 정합성 문제 사유
 * @param errorCode 예외 코드 (기본값: 'DATA_INTEGRITY_VIOLATION')
 */
export class DataIntegrityException extends InfraException {
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
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      errorCode: errorCode?.toUpperCase() || 'DATA_INTEGRITY_VIOLATION',
      message: `데이터 정합성 오류 (${entityName}): ${reason}`,
    });
  }
}

/**
 * ConcurrentUpdateException
 * 낙관적 락 등 동시성 충돌로 업데이트에 실패했을 때 발생하는 예외
 *
 * @example
 * // 버전 충돌 시
 * throw new ConcurrentUpdateException({ entityName: 'Account' });
 *
 * @param entityName 충돌이 발생한 엔티티 이름
 * @param errorCode 예외 코드 (기본값: 'CONCURRENT_UPDATE')
 */
export class ConcurrentUpdateException extends InfraException {
  constructor({
    entityName,
    errorCode,
  }: {
    entityName: string;
    errorCode?: string;
  }) {
    super({
      statusCode: HttpStatus.CONFLICT,
      errorCode: errorCode?.toUpperCase() || 'CONCURRENT_UPDATE',
      message: `${entityName} 동시성 충돌로 업데이트에 실패했습니다`,
    });
  }
}

/**
 * FileSystemException
 * 파일 시스템 작업 중 오류가 발생했을 때 발생하는 예외
 *
 * @example
 * // 파일 읽기 오류 시
 * throw new FileSystemException({
 *   operation: 'read',
 *   filePath: '/uploads/image.jpg',
 *   reason: '파일에 접근할 수 없습니다'
 * });
 *
 * @param operation 실패한 파일 시스템 작업 (예: 'read', 'write', 'delete')
 * @param filePath 작업 대상 파일 경로
 * @param reason 작업 실패 사유
 * @param errorCode 예외 코드 (기본값: 'FILESYSTEM_ERROR')
 */
export class FileSystemException extends InfraException {
  constructor({
    operation,
    filePath,
    reason,
    errorCode,
  }: {
    operation: string;
    filePath?: string;
    reason: string;
    errorCode?: string;
  }) {
    super({
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      errorCode: errorCode?.toUpperCase() || 'FILESYSTEM_ERROR',
      message: `파일 시스템 오류 (${operation}${filePath ? `: ${filePath}` : ''}): ${reason}`,
    });
  }
}
