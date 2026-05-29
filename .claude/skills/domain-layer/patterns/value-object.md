# Value Object 작성 패턴

Value Object는 불변 값을 나타내는 객체입니다.

## @lib/domain 내장 Value Objects

대부분의 경우 직접 만들지 말고 내장 Value Objects를 우선 사용합니다:

| Value Object     | 용도                    | 주요 옵션                                                   |
| ---------------- | ----------------------- | ----------------------------------------------------------- |
| `BoundedString`  | 길이 제한이 있는 문자열 | `fieldName`, `minLength`, `maxLength`, `allowEmpty`, `trim` |
| `Email`          | 이메일 형식 검증        | -                                                           |
| `Phone`          | 전화번호 형식 검증      | -                                                           |
| `Integer`        | 정수 검증               | `fieldName`, `min`, `max`                                   |
| `PositiveNumber` | 양수 검증               | `fieldName`                                                 |
| `Coordinate`     | 좌표값 검증             | -                                                           |
| `UniqueEntityId` | 엔티티 ID               | -                                                           |

### BoundedString 사용 예시

```typescript
// 생성 시 (create에서 검증 포함)
const title = BoundedString.create(value, {
  fieldName: 'title',
  minLength: 1,
  maxLength: 255,
});

// 선택적 필드 (빈 값 허용)
const description = BoundedString.create(value, {
  fieldName: 'description',
  maxLength: 65535,
  allowEmpty: true,
});

// Mapper에서 복원 시 (검증 없음)
const title = BoundedString.unsafeCreate(rawValue);
```

## 커스텀 Value Object 작성

내장 VO로 표현할 수 없는 도메인 규칙이 있을 때만 커스텀 VO를 작성합니다.

### 실제 코드 예시 (Password)

```typescript
import { ValueObject } from '@lib/domain';
import { ValueObjectValidationException } from '@shared/exception';

export const PasswordError = {
  TooShort: '비밀번호는 최소 8자 이상이어야 합니다.',
  NoUpperCase: '비밀번호에 대문자가 포함되어야 합니다.',
  NoLowerCase: '비밀번호에 소문자가 포함되어야 합니다.',
  NoNumber: '비밀번호에 숫자가 포함되어야 합니다.',
  NoSpecialChar: '비밀번호에 특수문자가 포함되어야 합니다.',
} as const;

interface PasswordProps {
  value: string;
  hashed: boolean;
}

export class Password extends ValueObject<PasswordProps> {
  private constructor(props: PasswordProps) {
    super(props);
  }

  get value(): string {
    return this.props.value;
  }

  get isHashed(): boolean {
    return this.props.hashed;
  }

  /**
   * 비밀번호를 생성합니다.
   * @param password 비밀번호 원문
   * @param hashed 이미 해시된 값인지 여부
   * @throws {ValueObjectValidationException} TOO_SHORT - 8자 미만
   */
  static async create(password: string, hashed?: boolean): Promise<Password> {
    if (!hashed) {
      if (password.length < 8) {
        throw new ValueObjectValidationException({
          entityName: Password.name,
          reason: PasswordError.TooShort,
          errorCode: 'TOO_SHORT',
        });
      }
      // 추가 검증 로직...
    }
    return new Password({ value: password, hashed: hashed ?? false });
  }

  /**
   * 검증 없이 생성 (매퍼용)
   */
  static unsafeCreate(password: string, hashed = false): Password {
    return new Password({ value: password, hashed });
  }

  async comparePassword(plainPassword: Password): Promise<boolean> {
    // bcrypt compare 로직
  }
}
```

## 커스텀 VO 기본 템플릿

```typescript
import { ValueObject } from '@lib/domain';
import { ValueObjectValidationException } from '@shared/exception';

export const {ValueObjectName}Error = {
  InvalidValue: '유효하지 않은 값입니다.',
  // 도메인 규칙별 에러 메시지 추가
} as const;

interface {ValueObjectName}Props {
  value: string;
}

export class {ValueObjectName} extends ValueObject<{ValueObjectName}Props> {
  private constructor(props: {ValueObjectName}Props) {
    super(props);
  }

  get value(): string {
    return this.props.value;
  }

  /**
   * {ValueObjectName}을 생성합니다
   * @param value 값
   * @throws {ValueObjectValidationException} INVALID_VALUE - 유효하지 않은 값
   */
  static create(value: string): {ValueObjectName} {
    if (!value || value.trim().length === 0) {
      throw new ValueObjectValidationException({
        entityName: {ValueObjectName}.name,
        reason: {ValueObjectName}Error.InvalidValue,
        errorCode: 'INVALID_VALUE',
      });
    }

    return new {ValueObjectName}({ value: value.trim() });
  }

  /**
   * 검증 없이 생성 (매퍼용)
   */
  static unsafeCreate(value: string): {ValueObjectName} {
    return new {ValueObjectName}({ value });
  }
}
```

## 중요 규칙

- **private constructor**
- **static `create()`**: validation 포함
- **static `unsafeCreate()`**: validation 없음 (매퍼에서 사용)
- Error 상수 객체는 `as const`로 정의
- Exception은 `ValueObjectValidationException` 사용 (import from `@shared/exception`)
- `ValueObjectValidationException` 파라미터: `{ entityName, reason, errorCode }`
