import { ValueObject } from '../value-object';
import { ValueObjectValidationException } from '@shared/exception';

interface IntegerProps {
  value: number;
  fieldName: string;
}

interface IntegerOptions {
  fieldName: string;
  minValue?: number;
  maxValue?: number;
}

/**
 * 정수 값 객체
 *
 * 양수, 음수, 0을 모두 허용하며, 최소값/최대값 제한을 지원하는 정수 VO입니다.
 *
 * @example
 * // 경험치 변화량 (음수 허용)
 * const expChange = Integer.create(dto.expOnFailure, {
 *   fieldName: '실패 시 경험치',
 *   minValue: -100,
 *   maxValue: 100,
 * });
 *
 * @example
 * // 재고 변화량 (음수 허용)
 * const stockChange = Integer.create(dto.stockDelta, {
 *   fieldName: '재고 변화량',
 * });
 *
 * @example
 * // 점수 (0 이상만)
 * const score = Integer.create(dto.score, {
 *   fieldName: '점수',
 *   minValue: 0,
 * });
 */
export class Integer extends ValueObject<IntegerProps> {
  private constructor(props: IntegerProps) {
    super(props);
  }

  /**
   * 정수를 생성합니다.
   *
   * @param value 검증할 정수 값
   * @param options 검증 옵션
   * @param options.fieldName 필드명 (에러 메시지에 사용)
   * @param options.minValue 최소값 (기본값: Number.MIN_SAFE_INTEGER)
   * @param options.maxValue 최대값 (기본값: Number.MAX_SAFE_INTEGER)
   *
   * @throws {ValueObjectValidationException} {FIELD_NAME}_REQUIRED - 필수 값이 없습니다.
   * @throws {ValueObjectValidationException} {FIELD_NAME}_INVALID - 유효하지 않은 숫자입니다.
   * @throws {ValueObjectValidationException} {FIELD_NAME}_NOT_INTEGER - 정수가 아닙니다.
   * @throws {ValueObjectValidationException} {FIELD_NAME}_TOO_SMALL - 최소값보다 작습니다.
   * @throws {ValueObjectValidationException} {FIELD_NAME}_TOO_LARGE - 최대값을 초과했습니다.
   */
  static create(value: number, options: IntegerOptions): Integer {
    const {
      fieldName: inputFieldName,
      minValue = Number.MIN_SAFE_INTEGER,
      maxValue = Number.MAX_SAFE_INTEGER,
    } = options;

    // null/undefined 검증
    if (value === null || value === undefined) {
      throw new ValueObjectValidationException({
        entityName: inputFieldName,
        reason: '필수 값입니다',
        errorCode: `${this.toErrorCode(inputFieldName)}_REQUIRED`,
      });
    }

    // 숫자 타입 검증
    if (typeof value !== 'number' || isNaN(value) || !isFinite(value)) {
      throw new ValueObjectValidationException({
        entityName: inputFieldName,
        reason: '유효한 숫자여야 합니다',
        errorCode: `${this.toErrorCode(inputFieldName)}_INVALID`,
      });
    }

    // 정수 검증
    if (!Number.isInteger(value)) {
      throw new ValueObjectValidationException({
        entityName: inputFieldName,
        reason: '정수여야 합니다',
        errorCode: `${this.toErrorCode(inputFieldName)}_NOT_INTEGER`,
      });
    }

    // 최소값 검증
    if (value < minValue) {
      throw new ValueObjectValidationException({
        entityName: inputFieldName,
        reason: `최소값 ${minValue}보다 작을 수 없습니다`,
        errorCode: `${this.toErrorCode(inputFieldName)}_TOO_SMALL`,
      });
    }

    // 최대값 검증
    if (value > maxValue) {
      throw new ValueObjectValidationException({
        entityName: inputFieldName,
        reason: `최대값 ${maxValue}을 초과할 수 없습니다`,
        errorCode: `${this.toErrorCode(inputFieldName)}_TOO_LARGE`,
      });
    }

    return new Integer({ value, fieldName: inputFieldName });
  }

  static unsafeCreate(value: number, fieldName: string): Integer {
    return new Integer({ value, fieldName });
  }

  /**
   * 필드명을 에러 코드 형식으로 변환합니다.
   *
   * camelCase를 snake_case로 변환하고, 공백을 언더스코어로 변환하며,
   * 영문/숫자/한글/언더스코어만 남기고, 대문자로 변환합니다.
   *
   * @param fieldName 변환할 필드명
   * @returns 에러 코드 형식의 문자열
   *
   * @example
   * toErrorCode('expOnFailure')  // 'EXP_ON_FAILURE'
   * toErrorCode('경험치')         // '경험치'
   * toErrorCode('stock change')   // 'STOCK_CHANGE'
   */
  private static toErrorCode(fieldName: string): string {
    return fieldName
      .replace(/([a-z])([A-Z])/g, '$1_$2')
      .replace(/\s+/g, '_')
      .replace(/[^\w가-힣]/g, '')
      .toUpperCase();
  }

  get value(): number {
    return this.props.value;
  }

  /**
   * 다른 Integer와 더합니다.
   */
  add(other: Integer): Integer {
    return Integer.unsafeCreate(this.value + other.value, this.props.fieldName);
  }

  /**
   * 다른 Integer를 뺍니다.
   */
  subtract(other: Integer): Integer {
    return Integer.unsafeCreate(this.value - other.value, this.props.fieldName);
  }

  /**
   * 다른 Integer와 곱합니다.
   */
  multiply(other: Integer): Integer {
    return Integer.unsafeCreate(this.value * other.value, this.props.fieldName);
  }

  /**
   * 다른 Integer로 나눕니다 (정수 나눗셈).
   */
  divide(other: Integer): Integer {
    if (other.value === 0) {
      throw new ValueObjectValidationException({
        entityName: this.props.fieldName,
        reason: '0으로 나눌 수 없습니다',
        errorCode: `${Integer.toErrorCode(this.props.fieldName)}_DIVIDE_BY_ZERO`,
      });
    }
    return Integer.unsafeCreate(
      Math.floor(this.value / other.value),
      this.props.fieldName,
    );
  }

  /**
   * 절대값을 반환합니다.
   */
  abs(): Integer {
    return Integer.unsafeCreate(Math.abs(this.value), this.props.fieldName);
  }

  /**
   * 부호를 반전합니다.
   */
  negate(): Integer {
    return Integer.unsafeCreate(-this.value, this.props.fieldName);
  }

  /**
   * 양수인지 확인합니다.
   */
  isPositive(): boolean {
    return this.value > 0;
  }

  /**
   * 음수인지 확인합니다.
   */
  isNegative(): boolean {
    return this.value < 0;
  }

  /**
   * 0인지 확인합니다.
   */
  isZero(): boolean {
    return this.value === 0;
  }

  /**
   * 다른 Integer와 비교합니다.
   */
  isGreaterThan(other: Integer): boolean {
    return this.value > other.value;
  }

  /**
   * 다른 Integer와 비교합니다.
   */
  isLessThan(other: Integer): boolean {
    return this.value < other.value;
  }

  /**
   * 다른 Integer와 같은지 확인합니다.
   */
  equals(other: Integer): boolean {
    return this.value === other.value;
  }
}
