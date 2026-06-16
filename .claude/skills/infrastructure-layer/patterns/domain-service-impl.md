# Domain Service 구현체 작성 패턴

Domain Layer에서 `abstract class`로 정의된 Domain Service의 Infrastructure 구현체입니다. 타 BC 데이터 조회(LookupService) 또는 외부 모델 변환(ACL) 역할을 합니다.

## LookupService vs ACL

- **LookupService**: 타 BC 엔티티의 존재/상태를 확인하는 단순 조회 (boolean 반환, 모델 변환 없음)
- **ACL(Anti-Corruption Layer)**: 외부 BC의 모델을 자기 도메인 언어(타입)로 변환하는 번역 계층

## 패턴 1: 존재 확인 (가장 일반적)

다른 컨텍스트의 데이터가 존재하는지 확인하는 단순한 패턴입니다:

```typescript
import { Injectable } from '@nestjs/common';
import { PrismaService } from '@core/database/prisma.service';
import { CategoryLookupService } from '../../domain/services';

/**
 * CategoryLookupServiceImpl
 * - 타 BC 엔티티 존재 확인용 LookupService
 * - 카테고리 BC의 데이터를 Prisma 직접 쿼리로 조회
 */
@Injectable()
export class CategoryLookupServiceImpl implements CategoryLookupService {
  constructor(private readonly prisma: PrismaService) {}

  async existsById(id: string): Promise<boolean> {
    const count = await this.prisma.category.count({
      where: { id, isActive: true, deletedAt: null },
    });
    return count > 0;
  }
}
```

## 패턴 2: 다른 컨텍스트 조회 → 자기 컨텍스트 타입 반환 (ACL)

다른 컨텍스트의 데이터를 조회하여 Domain에서 정의한 인터페이스로 변환하는 ACL 패턴입니다:

```typescript
import { Injectable } from '@nestjs/common';
import { PrismaService } from '@core/database/prisma.service';
import { PaymentGatewayService, PaymentInfo } from '../../domain/services';

/**
 * PaymentGatewayServiceImpl
 * - Anti-Corruption Layer 역할
 * - 외부 결제 시스템의 데이터를 조회하여
 *   현재 컨텍스트의 언어(PaymentInfo)로 번역
 */
@Injectable()
export class PaymentGatewayServiceImpl implements PaymentGatewayService {
  constructor(private readonly prisma: PrismaService) {}

  async findPaymentInfo(paymentId: string): Promise<PaymentInfo | undefined> {
    const raw = await this.prisma.payment.findUnique({
      where: { id: paymentId },
      select: {
        id: true,
        status: true,
        amount: true,
        approvedAt: true,
      },
    });

    if (!raw) {
      return undefined;
    }

    // 다른 컨텍스트의 데이터 → 자기 컨텍스트의 인터페이스로 번역
    return {
      paymentId: raw.id,
      status: raw.status,
      amount: raw.amount,
      approvedAt: raw.approvedAt !== null ? raw.approvedAt : undefined,
    };
  }
}
```

## 패턴 3: 다른 컨텍스트 데이터 기반 판단

다른 컨텍스트의 데이터를 조회하여 boolean 등 단순 결과를 반환하는 패턴:

```typescript
import { Injectable } from '@nestjs/common';
import { PrismaService } from '@core/database/prisma.service';
import { MemberDependencyCheckService } from '../../domain/services';

/**
 * MemberDependencyCheckServiceImpl
 * - 타 BC 엔티티 존재 확인용 LookupService
 * - 멤버 BC의 구성원 존재 여부를 Prisma 직접 쿼리로 조회
 */
@Injectable()
export class MemberDependencyCheckServiceImpl
  implements MemberDependencyCheckService
{
  constructor(private readonly prisma: PrismaService) {}

  async hasMembers(departmentId: string): Promise<boolean> {
    const count = await this.prisma.member.count({
      where: { departmentId, deletedAt: null },
    });
    return count > 0;
  }
}
```

## Domain Service vs Query Service

| 구분        | Domain Service 구현체                         | Query Service 구현체                          |
| ----------- | --------------------------------------------- | --------------------------------------------- |
| 역할        | 다른 컨텍스트 데이터 조회 (LookupService/ACL) | 같은 컨텍스트 데이터 조회                     |
| 반환 타입   | Domain에서 정의한 인터페이스/타입             | ReadModel                                     |
| 사용처      | Application UseCase에서 주입                  | Application UseCase에서 주입                  |
| 파일 위치   | `infra/services/{name}.service.impl.ts`       | `infra/services/{name}-query.service.impl.ts` |
| Domain 정의 | `abstract class {Name}Service`                | `abstract class {Name}QueryService`           |

## 파일 구조

```
src/module/{module-name}/
├── domain/services/
│   └── {service-name}.service.ts        # abstract class (Domain)
└── infra/services/
    └── {service-name}.service.impl.ts   # 구현체 (Infrastructure)
```

## NestJS 모듈 등록

Domain Service 구현체는 NestJS Module에서 `provide/useClass`로 등록합니다:

```typescript
@Module({
  providers: [
    {
      provide: CategoryLookupService,
      useClass: CategoryLookupServiceImpl,
    },
  ],
  exports: [CategoryLookupService],
})
```

## 중요 규칙

- `@Injectable()` 데코레이터 필수
- Domain Service의 abstract class를 `implements`
- PrismaService 주입
- JSDoc에 역할 명시 (LookupService 또는 ACL, 어느 컨텍스트 → 어느 컨텍스트)
- 반환 타입은 Domain에서 정의한 인터페이스만 사용

## 주의사항

- ❌ Domain Entity를 직접 반환하지 않음 (Domain에서 정의한 DTO/인터페이스 반환)
- ❌ 비즈니스 로직 포함 금지 (조회 + 변환만)
- ✅ LookupService: boolean 반환으로 존재 확인 / ACL: 자기 컨텍스트의 타입으로 변환
- ✅ `select`로 필요한 필드만 조회 (성능 최적화)
