import { ValueObject } from '../value-object';
import {
  DomainRuleViolationException,
  ValueObjectValidationException,
} from '@shared/exception';

interface PositiveNumberProps {
  value: number;
  fieldName: string;
}

interface PositiveNumberOptions {
  fieldName: string;
  allowZero?: boolean;
  maxValue?: number;
  allowDecimal?: boolean;
}

/**
 * 양수(또는 0 포함) 숫자 값 객체
 *
 * 음수 불가, 최대값 제한, 소수점 허용 여부 등을 지원하는 범용 숫자 VO입니다.
 *
 * @example
 * // 가격 (0 이상, 소수점 허용)
 * const price = PositiveNumber.create(dto.price, {
 *   fieldName: '가격',
 *   allowZero: true,
 *   allowDecimal: true,
 * });
 *
 * @example
 * // 재고 (1 이상, 정수만)
 * const stock = PositiveNumber.create(dto.stock, {
 *   fieldName: '재고',
 *   allowZero: false,
 *   allowDecimal: false,
 * });
 *
 * @example
 * // 할인가격 (0 이상, 최대값 제한)
 * const discountPrice = PositiveNumber.create(dto.discountPrice, {
 *   fieldName: '할인가격',
 *   allowZero: true,
 *   maxValue: originalPrice,
 *   allowDecimal: true,
 * });
 */
export class PositiveNumber extends ValueObject<PositiveNumberProps> {
  private constructor(props: PositiveNumberProps) {
    super(props);
  }

  /**
   * 양수 숫자를 생성합니다.
   *
   * @param value 검증할 숫자 값
   * @param options 검증 옵션
   * @param options.fieldName 필드명 (에러 메시지에 사용)
   * @param options.allowZero 0 허용 여부 (기본값: true)
   * @param options.maxValue 최대값 (기본값: Number.MAX_SAFE_INTEGER)
   * @param options.allowDecimal 소수점 허용 여부 (기본값: false)
   *
   * @throws {ValueObjectValidationException} {FIELD_NAME}_REQUIRED - 필수 값이 없습니다.
   * @throws {ValueObjectValidationException} {FIELD_NAME}_INVALID - 유효하지 않은 숫자입니다.
   * @throws {ValueObjectValidationException} {FIELD_NAME}_NEGATIVE - 음수는 허용되지 않습니다.
   * @throws {ValueObjectValidationException} {FIELD_NAME}_ZERO_NOT_ALLOWED - 0은 허용되지 않습니다.
   * @throws {ValueObjectValidationException} {FIELD_NAME}_TOO_LARGE - 최대값을 초과했습니다.
   * @throws {ValueObjectValidationException} {FIELD_NAME}_DECIMAL_NOT_ALLOWED - 소수점은 허용되지 않습니다.
   */
  static create(value: number, options: PositiveNumberOptions): PositiveNumber {
    const {
      fieldName: inputFieldName,
      allowZero = true,
      maxValue = Number.MAX_SAFE_INTEGER,
      allowDecimal = false,
    } = options;

    // null/undefined 검증
    if (value === null || value === undefined) {
      throw new ValueObjectValidationException({
        detail: '필수 값입니다',
        code: `${this.toErrorCode(inputFieldName)}_REQUIRED`,
      });
    }

    // 숫자 타입 검증
    if (typeof value !== 'number' || isNaN(value) || !isFinite(value)) {
      throw new ValueObjectValidationException({
        detail: '유효한 숫자여야 합니다',
        code: `${this.toErrorCode(inputFieldName)}_INVALID`,
      });
    }

    // 음수 검증
    if (value < 0) {
      throw new ValueObjectValidationException({
        detail: '음수는 허용되지 않습니다',
        code: `${this.toErrorCode(inputFieldName)}_NEGATIVE`,
      });
    }

    // 0 허용 여부 검증
    if (!allowZero && value === 0) {
      throw new ValueObjectValidationException({
        detail: '0은 허용되지 않습니다',
        code: `${this.toErrorCode(inputFieldName)}_ZERO_NOT_ALLOWED`,
      });
    }

    // 최대값 검증
    if (value > maxValue) {
      throw new ValueObjectValidationException({
        detail: `최대값 ${maxValue}을 초과할 수 없습니다`,
        code: `${this.toErrorCode(inputFieldName)}_TOO_LARGE`,
      });
    }

    // 소수점 허용 여부 검증
    if (!allowDecimal && !Number.isInteger(value)) {
      throw new ValueObjectValidationException({
        detail: '소수점은 허용되지 않습니다',
        code: `${this.toErrorCode(inputFieldName)}_DECIMAL_NOT_ALLOWED`,
      });
    }

    return new PositiveNumber({ value, fieldName: inputFieldName });
  }

  static unsafeCreate(value: number, fieldName: string): PositiveNumber {
    return new PositiveNumber({ value, fieldName });
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
   * toErrorCode('discountPrice')  // 'DISCOUNT_PRICE'
   * toErrorCode('재고')           // '재고'
   * toErrorCode('stock count')    // 'STOCK_COUNT'
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
   * 다른 PositiveNumber와 더합니다.
   */
  add(other: PositiveNumber): PositiveNumber {
    return PositiveNumber.unsafeCreate(
      this.value + other.value,
      this.props.fieldName,
    );
  }

  /**
   * 다른 PositiveNumber를 뺍니다.
   *
   * @throws {DomainRuleViolationException} {FIELD_NAME}_NEGATIVE - 음수가 될 수 없습니다.
   */
  subtract(other: PositiveNumber): PositiveNumber {
    const result = this.value - other.value;
    if (result < 0) {
      throw new DomainRuleViolationException({
        entityName: this.props.fieldName,
        reason: `${this.props.fieldName}는 음수가 될 수 없습니다`,
        errorCode: `${PositiveNumber.toErrorCode(this.props.fieldName)}_NEGATIVE`,
      });
    }
    return PositiveNumber.unsafeCreate(result, this.props.fieldName);
  }

  /**
   * 다른 PositiveNumber와 곱합니다.
   */
  multiply(other: PositiveNumber): PositiveNumber {
    return PositiveNumber.unsafeCreate(
      this.value * other.value,
      this.props.fieldName,
    );
  }

  /**
   * 다른 PositiveNumber로 나눕니다.
   *
   * @throws {DomainRuleViolationException} {FIELD_NAME}_DIVIDE_BY_ZERO - 0으로 나눌 수 없습니다.
   */
  divide(other: PositiveNumber): PositiveNumber {
    if (other.value === 0) {
      throw new DomainRuleViolationException({
        entityName: this.props.fieldName,
        reason: `${this.props.fieldName}는 0으로 나눌 수 없습니다`,
        errorCode: `${PositiveNumber.toErrorCode(this.props.fieldName)}_DIVIDE_BY_ZERO`,
      });
    }
    return PositiveNumber.unsafeCreate(
      this.value / other.value,
      this.props.fieldName,
    );
  }

  /**
   * 다른 PositiveNumber와 비교합니다.
   */
  isGreaterThan(other: PositiveNumber): boolean {
    return this.value > other.value;
  }

  /**
   * 다른 PositiveNumber와 비교합니다.
   */
  isLessThan(other: PositiveNumber): boolean {
    return this.value < other.value;
  }

  /**
   * 다른 PositiveNumber와 같은지 확인합니다.
   */
  equals(other: PositiveNumber): boolean {
    return this.value === other.value;
  }
}
