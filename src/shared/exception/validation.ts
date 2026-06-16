import { ValidationError } from 'class-validator';
import { BaseException, FieldError } from './base.exception';
import { ErrorCategory } from './error-category';

/**
 * 요청 바디(DTO) 검증 실패 — **다건 필드 오류** 보유 (→ 400)
 *
 * `ValidationPipe.exceptionFactory`(`validationExceptionFactory`)가 class-validator
 * 에러를 모아 생성한다. (DTO 타입가드는 배치 검증이라 자연히 다건 → `errors[]`)
 * VO 단건 검증은 `ValueObjectValidationException`이 단건 `code`로 직접 던진다.
 */
export class RequestValidationException extends BaseException {
  constructor(errors: FieldError[]) {
    super({
      category: ErrorCategory.VALIDATION,
      code: 'VALIDATION_FAILED',
      message: '요청 검증에 실패했습니다.',
      errors,
    });
  }
}

/** class-validator 제약 키 → 필드 에러 code (DTO는 타입가드만이라 소수) */
const CONSTRAINT_CODE: Record<string, string> = {
  isDefined: 'REQUIRED',
  isNotEmpty: 'REQUIRED',
  isString: 'INVALID_TYPE',
  isNumber: 'INVALID_TYPE',
  isInt: 'INVALID_TYPE',
  isBoolean: 'INVALID_TYPE',
  isArray: 'INVALID_TYPE',
  isDate: 'INVALID_TYPE',
  isEnum: 'INVALID_VALUE',
  min: 'OUT_OF_RANGE',
  max: 'OUT_OF_RANGE',
};

function constraintToCode(key: string): string {
  return CONSTRAINT_CODE[key] ?? 'INVALID';
}

/** class-validator ValidationError[] → FieldError[] (중첩 필드는 `a.b`로 평탄화) */
export function toFieldErrors(errors: ValidationError[]): FieldError[] {
  const out: FieldError[] = [];

  const walk = (errs: ValidationError[], parent = ''): void => {
    for (const e of errs) {
      const name = parent ? `${parent}.${e.property}` : e.property;
      if (e.constraints) {
        for (const [key, detail] of Object.entries(e.constraints)) {
          out.push({ name, code: constraintToCode(key), detail });
        }
      }
      if (e.children && e.children.length > 0) {
        walk(e.children, name);
      }
    }
  };

  walk(errors);
  return out;
}

/** ValidationPipe에 주입할 exceptionFactory */
export function validationExceptionFactory(
  errors: ValidationError[],
): RequestValidationException {
  return new RequestValidationException(toFieldErrors(errors));
}
