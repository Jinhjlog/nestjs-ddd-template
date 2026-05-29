import { ValueObject } from '@lib/domain';
import { ValueObjectValidationException } from '@shared/exception';

interface PhoneProps {
  value: string;
}

export const PhoneError = {
  InvalidPhone: '유효하지 않은 전화번호 형식입니다.',
} as const;

export class Phone extends ValueObject<PhoneProps> {
  private constructor(props: PhoneProps) {
    super(props);
  }

  get value(): string {
    return this.props.value;
  }

  private static normalize(value: string): string {
    let normalized = value.replace(/[\s\-().]/g, '');

    if (normalized.startsWith('+82')) {
      normalized = '0' + normalized.slice(3);
    } else if (normalized.startsWith('82')) {
      normalized = '0' + normalized.slice(2);
    }

    return normalized;
  }

  private static isValidPhone(value: string): boolean {
    const regex = /^[0-9]{10,11}$/;
    return regex.test(value);
  }

  /**
   * 전화번호 Value Object
   *
   * 다양한 입력 형식을 허용하며 내부적으로 숫자만 남긴 형태로 정규화합니다.
   * - "010-1234-5678" → "01012345678"
   * - "010 1234 5678" → "01012345678"
   * - "+82 10 1234 5678" → "01012345678"
   *
   * @throws {ValueObjectValidationException} INVALID_PHONE - 유효하지 않은 전화번호 형식입니다.
   */
  static create(phone: string) {
    const normalized = this.normalize(phone);

    if (!this.isValidPhone(normalized)) {
      throw new ValueObjectValidationException({
        entityName: Phone.name,
        reason: PhoneError.InvalidPhone,
        errorCode: 'INVALID_PHONE',
      });
    }

    return new Phone({ value: normalized });
  }

  static unsafeCreate(phone: string): Phone {
    return new Phone({ value: phone });
  }
}
