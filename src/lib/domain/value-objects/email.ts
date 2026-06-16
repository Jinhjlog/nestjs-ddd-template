import { ValueObject } from '@lib/domain';
import { ValueObjectValidationException } from '@shared/exception';

export const EmailError = {
  InvalidEmail: '유효하지 않은 이메일 형식입니다.',
} as const;

interface EmailProps {
  value: string;
}

export class Email extends ValueObject<EmailProps> {
  private constructor(props: EmailProps) {
    super(props);
  }

  get value(): string {
    return this.props.value;
  }

  private static isValidEmail(value: string): boolean {
    const regex =
      /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)*$/;
    return regex.test(value);
  }

  /**
   * 이메일을 생성합니다
   *
   * @throws {ValueObjectValidationException} INVALID_EMAIL_FORMAT - 유효하지 않은 이메일 형식입니다.
   */
  static create(email: string) {
    if (!this.isValidEmail(email)) {
      throw new ValueObjectValidationException({
        detail: EmailError.InvalidEmail,
        code: 'INVALID_EMAIL_FORMAT',
      });
    }

    return new Email({ value: email });
  }

  static unsafeCreate(email: string): Email {
    return new Email({ value: email });
  }
}
