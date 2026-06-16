import { ValueObject } from '@lib/domain';
import { ValueObjectValidationException } from '@shared/exception';
import * as bcrypt from 'bcrypt';

export interface PasswordProps {
  value: string;
  hashed?: boolean;
}

export const PasswordError = {
  TooShortPassword: '비밀번호는 8자 이상 입력되어야 합니다.',
  TooLongPassword: '비밀번호는 25자 이하로 입력되어야 합니다.',
  MissingSpecialCharacter:
    '비밀번호에는 특수문자가 1개 이상 포함되어야 합니다.',
  InvalidPasswordComparison:
    '비밀번호 비교 실패: 저장된 비밀번호는 해시되어야 하고, 입력된 비밀번호는 평문이어야 합니다.',
} as const;

export class Password extends ValueObject<PasswordProps> {
  static readonly MIN_LENGTH = 8;
  static readonly MAX_LENGTH = 25;
  static readonly SPECIAL_CHAR_REGEX = /[!@#$%^&*(),.?":{}|<>]/;

  private constructor(props: PasswordProps) {
    super(props);
  }

  /** 비밀번호 값 (평문 또는 해시) */
  get value(): string {
    return this.props.value;
  }

  /**
   * 비밀번호를 검증하고 생성합니다.
   * hashed=true 시 해시 처리 후 반환, false 시 평문 그대로 반환합니다.
   *
   * @param password 평문 비밀번호
   * @param hashed true이면 해시 처리 후 반환
   * @throws {ValueObjectValidationException} PASSWORD_TOO_SHORT - 8자 미만
   * @throws {ValueObjectValidationException} PASSWORD_TOO_LONG - 25자 초과
   * @throws {ValueObjectValidationException} PASSWORD_MISSING_SPECIAL_CHARACTER - 특수문자 미포함
   */
  static async create(password: string, hashed?: boolean): Promise<Password> {
    if (password.length < this.MIN_LENGTH) {
      throw new ValueObjectValidationException({
        detail: PasswordError.TooShortPassword,
        code: 'PASSWORD_TOO_SHORT',
      });
    }

    if (password.length > this.MAX_LENGTH) {
      throw new ValueObjectValidationException({
        detail: PasswordError.TooLongPassword,
        code: 'PASSWORD_TOO_LONG',
      });
    }

    if (!this.SPECIAL_CHAR_REGEX.test(password)) {
      throw new ValueObjectValidationException({
        detail: PasswordError.MissingSpecialCharacter,
        code: 'PASSWORD_MISSING_SPECIAL_CHARACTER',
      });
    }

    if (hashed) {
      return new Password({
        value: await this.hashPassword(password),
        hashed: true,
      });
    }

    return new Password({ value: password, hashed: false });
  }

  /**
   * 검증 없이 생성합니다. (DB에서 조회한 해시 비밀번호를 매핑할 때 사용)
   */
  static unsafeCreate(password: string, hashed = false): Password {
    return new Password({ value: password, hashed });
  }

  /** 평문을 bcrypt로 해시합니다. (static 내부용) */
  private static hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, 10);
  }

  /**
   * 현재 평문 비밀번호를 해시된 Password로 변환합니다.
   * 이미 해시된 상태이면 그대로 반환합니다.
   */
  async hashPassword(): Promise<Password> {
    if (this.props.hashed) {
      return this;
    }

    const hashedValue = await bcrypt.hash(this.props.value, 10);
    return new Password({ value: hashedValue, hashed: true });
  }

  /**
   * 입력받은 평문 비밀번호가 현재 해시와 일치하는지 비교합니다.
   *
   * @param plainPassword 비교할 평문 Password 객체
   * @returns 비밀번호 일치 여부
   * @throws {ValueObjectValidationException} INVALID_PASSWORD_COMPARISON - 비교 조건이 맞지 않는 경우
   *
   * @example
   * const inputPassword = await Password.create("plaintext");
   * const isMatch = await user.password.comparePassword(inputPassword);
   */
  async comparePassword(plainPassword: Password): Promise<boolean> {
    // 1. this(저장된 비밀번호)는 반드시 해시되어 있어야 함
    if (!this.props.hashed) {
      throw new ValueObjectValidationException({
        detail: PasswordError.InvalidPasswordComparison,
        code: 'INVALID_PASSWORD_COMPARISON',
      });
    }

    // 2. 입력받은 비밀번호는 평문이어야 함 (해시와 해시를 비교하면 안 됨)
    if (plainPassword.props.hashed) {
      throw new ValueObjectValidationException({
        detail: PasswordError.InvalidPasswordComparison,
        code: 'INVALID_PASSWORD_COMPARISON',
      });
    }

    // 3. bcrypt로 평문과 해시 비교
    return bcrypt.compare(plainPassword.value, this.props.value);
  }
}
