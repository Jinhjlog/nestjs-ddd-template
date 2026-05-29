# Domain Service 작성 패턴

Domain Service는 복잡한 도메인 로직을 캡슐화합니다. 세 가지 패턴이 있습니다.

## 패턴 1: abstract class (인터페이스 역할)

Infrastructure에서 구현합니다. NestJS DI 토큰으로 사용됩니다.

**사용 시점**: 외부 서비스나 다른 바운디드 컨텍스트의 데이터가 필요한 경우

```typescript
/**
 * 결제 처리 서비스
 *
 * 외부 결제 게이트웨이와의 통신을 추상화합니다.
 * Infrastructure에서 구현합니다.
 */
export abstract class PaymentProcessingService {
  /** 결제를 요청합니다. */
  abstract processPayment(
    orderId: string,
    amount: number,
  ): Promise<PaymentResult>;

  /** 결제를 취소합니다. */
  abstract cancelPayment(paymentId: string): Promise<void>;
}

export interface PaymentResult {
  paymentId: string;
  status: string;
  approvedAt: Date;
}
```

```typescript
/**
 * 카테고리 존재 확인 서비스 (LookupService)
 *
 * 현재 컨텍스트에서 다른 바운디드 컨텍스트의
 * 카테고리 존재 여부를 확인합니다.
 * Infrastructure에서 구현합니다.
 */
export abstract class CategoryLookupService {
  abstract existsById(id: string): Promise<boolean>;
}
```

## 패턴 2: @Injectable() 구체 클래스

도메인 레이어에서 직접 구현하며, NestJS Module에서 바로 providers에 등록합니다.

**사용 시점**: NestJS 서비스 주입이 필요하지만 도메인 레이어만으로 로직이 완결되는 경우

```typescript
import { Injectable } from '@nestjs/common';

/**
 * 인증 서비스
 *
 * 토큰 발급 및 갱신을 담당합니다.
 */
@Injectable()
export class AuthService {
  constructor(
    private readonly tokenRepository: TokenRepository,
    private readonly jwtService: JwtCoreService,
  ) {}

  /** 토큰을 발급합니다. */
  async issueTokens(userId: string): Promise<IssuedTokens> {
    const accessToken = this.jwtService.signAccessToken({ userId });
    const refreshToken = await this.createRefreshToken(userId);
    return { accessToken, refreshToken };
  }

  /** 토큰을 갱신합니다. */
  async refreshTokens(token: string): Promise<IssuedTokens> {
    // 토큰 검증 및 갱신 로직
  }

  private async createRefreshToken(userId: string): Promise<string> {
    // 리프레시 토큰 생성 로직
  }
}

export interface IssuedTokens {
  accessToken: string;
  refreshToken: string;
}
```

## 패턴 3: Pure Domain Service (static 메서드만)

의존성이 없는 순수 도메인 로직을 static 메서드로 제공합니다.

**사용 시점**: 외부 의존성 없이 도메인 규칙만으로 완결되는 검증/계산 로직

```typescript
import { DomainRuleViolationException } from '@shared/exception';

/**
 * 날짜 범위 검증 서비스
 *
 * @Injectable() 없음, static 메서드만 사용
 */
export class DateRangeValidationService {
  /** 시작일과 종료일의 범위를 검증합니다. */
  static validate(startDate: Date, endDate: Date): void {
    if (startDate >= endDate) {
      throw new DomainRuleViolationException({
        entityName: 'DateRange',
        reason: '시작일은 종료일보다 이전이어야 합니다.',
      });
    }
  }

  /** 두 날짜 범위가 겹치는지 확인합니다. */
  static isOverlapping(
    range1: { start: Date; end: Date },
    range2: { start: Date; end: Date },
  ): boolean {
    return range1.start < range2.end && range2.start < range1.end;
  }
}
```

## 어떤 패턴을 선택할까?

| 조건                            | 패턴                        | 예시                       |
| ------------------------------- | --------------------------- | -------------------------- |
| 다른 컨텍스트 데이터가 필요     | `abstract class`            | CategoryLookupService      |
| 외부 서비스 의존 (API, 파일 등) | `abstract class`            | PaymentProcessingService   |
| NestJS 서비스 주입이 필요       | `@Injectable()` 구체 클래스 | AuthService                |
| 의존성 없는 순수 로직           | Pure (static)               | DateRangeValidationService |

## 중요 규칙

- **abstract class**: abstract 메서드만 정의, Infrastructure에서 구현
- **@Injectable()**: NestJS Module의 providers에 직접 등록
- **Pure static**: 의존성 없이 독립적으로 동작
- Input/Output 인터페이스는 primitive types 사용
- JSDoc으로 서비스 역할과 에러 케이스 문서화

## 언제 사용하는가?

- 여러 엔티티를 조합하는 복잡한 로직
- 다른 바운디드 컨텍스트의 데이터가 필요한 경우 (LookupService/ACL)
- 비즈니스 규칙 검증이 필요한 경우
- 도메인 지식이 필요한 계산
- 단일 엔티티로 해결할 수 없는 로직
