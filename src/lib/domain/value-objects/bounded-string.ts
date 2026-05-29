import { ValueObject } from '../value-object';
import { ValueObjectValidationException } from '@shared/exception';

interface BoundedStringProps {
  value: string;
}

interface BoundedStringOptions {
  fieldName: string;
  minLength?: number;
  maxLength?: number;
  allowEmpty?: boolean;
  trim?: boolean;
}

/**
 * 길이 제한이 있는 문자열 값 객체
 *
 * 최소/최대 길이 검증, 빈 값 허용 여부, 공백 제거 등을 지원하는 범용 문자열 VO입니다.
 *
 * @example
 * // 입점사 이름 (100자 이내, 필수)
 * const name = BoundedString.create(dto.name, {
 *   fieldName: '입점사 이름',
 *   maxLength: 100,
 * });
 *
 * @example
 * // 설명 (최소 10자, 최대 500자)
 * const description = BoundedString.create(dto.description, {
 *   fieldName: '설명',
 *   minLength: 10,
 *   maxLength: 500,
 * });
 *
 * @example
 * // 선택적 필드 (비어있어도 됨, 최대 200자)
 * const memo = BoundedString.create(dto.memo, {
 *   fieldName: '메모',
 *   maxLength: 200,
 *   allowEmpty: true,
 * });
 */
export class BoundedString extends ValueObject<BoundedStringProps> {
  private constructor(props: BoundedStringProps) {
    super(props);
  }

  /**
   * 길이 제한이 있는 문자열을 생성합니다.
   *
   * @param value 검증할 문자열 값
   * @param options 검증 옵션
   * @param options.fieldName 필드명 (에러 메시지에 사용)
   * @param options.minLength 최소 길이 (기본값: 0)
   * @param options.maxLength 최대 길이 (기본값: Number.MAX_SAFE_INTEGER)
   * @param options.allowEmpty 빈 값 허용 여부 (기본값: false)
   * @param options.trim 공백 제거 여부 (기본값: true)
   *
   * @throws {ValueObjectValidationException} {FIELD_NAME}_REQUIRED - 필수 값이 비어있습니다.
   * @throws {ValueObjectValidationException} {FIELD_NAME}_TOO_SHORT - 최소 길이보다 짧습니다.
   * @throws {ValueObjectValidationException} {FIELD_NAME}_TOO_LONG - 최대 길이를 초과했습니다.
   */
  static create(value: string, options: BoundedStringOptions): BoundedString {
    const {
      fieldName,
      minLength = 0,
      maxLength = Number.MAX_SAFE_INTEGER,
      allowEmpty = false,
      trim = true,
    } = options;

    const processedValue = trim ? value?.trim() : value;

    // 비어있는 경우 검증
    if (!allowEmpty && (!processedValue || processedValue.length === 0)) {
      throw new ValueObjectValidationException({
        entityName: fieldName,
        reason: '비어있을 수 없습니다',
        errorCode: `${this.toErrorCode(fieldName)}_REQUIRED`,
      });
    }

    // 최소 길이 검증
    if (processedValue && processedValue.length < minLength) {
      throw new ValueObjectValidationException({
        entityName: fieldName,
        reason: `최소 ${minLength}자 이상이어야 합니다`,
        errorCode: `${this.toErrorCode(fieldName)}_TOO_SHORT`,
      });
    }

    // 최대 길이 검증
    if (processedValue && processedValue.length > maxLength) {
      throw new ValueObjectValidationException({
        entityName: fieldName,
        reason: `최대 ${maxLength}자 이내여야 합니다`,
        errorCode: `${this.toErrorCode(fieldName)}_TOO_LONG`,
      });
    }

    return new BoundedString({ value: processedValue || '' });
  }

  static unsafeCreate(value: string): BoundedString {
    return new BoundedString({ value });
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
   * toErrorCode('displayTitle')   // 'DISPLAY_TITLE'
   * toErrorCode('입점사 이름')     // '입점사_이름'
   * toErrorCode('tenant name')    // 'TENANT_NAME'
   * toErrorCode('TEXT_MAIN')      // 'TEXT_MAIN'
   */
  private static toErrorCode(fieldName: string): string {
    return fieldName
      .replace(/([a-z])([A-Z])/g, '$1_$2')
      .replace(/\s+/g, '_')
      .replace(/[^\w가-힣]/g, '')
      .toUpperCase();
  }

  get value(): string {
    return this.props.value;
  }
}
