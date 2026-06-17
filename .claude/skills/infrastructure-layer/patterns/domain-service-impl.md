# Domain Service 구현체 작성 패턴

Domain Layer에서 `abstract class`로 정의된 Domain Service의 Infrastructure 구현체입니다. **타 BC 데이터를 우리 DB에서 조회**(LookupService)하는 역할을 합니다.

## LookupService의 두 가지 반환 형태

둘 다 같은 **LookupService** 패턴이다 (별도 이름을 두지 않는다):

- **존재 확인**: 타 BC 엔티티가 있는지 `boolean` 반환 (모델 변환 없음)
- **데이터 조회·번역**: 타 BC 데이터를 읽어 자기 도메인 언어(타입)로 변환해 반환

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

## 패턴 2: 다른 컨텍스트 조회 → 자기 컨텍스트 타입 반환

**다른 BC의 데이터를 우리 DB에서 조회**하여 Domain에서 정의한 인터페이스로 번역하는 LookupService입니다 (외부 시스템 통신이 아니다 — 외부 기술이면 Port). 아래는 회원 BC의 기본 정보를 현재 컨텍스트 언어(`MemberProfile`)로 번역하는 예:

```typescript
import { Injectable } from '@nestjs/common';
import { PrismaService } from '@core/database/prisma.service';
import { MemberProfileLookupService, MemberProfile } from '../../domain/services';

/**
 * MemberProfileLookupServiceImpl
 * - LookupService (데이터 조회·번역 형태)
 * - 회원 BC의 데이터를 우리 DB에서 조회하여
 *   현재 컨텍스트의 언어(MemberProfile)로 번역
 */
@Injectable()
export class MemberProfileLookupServiceImpl
  implements MemberProfileLookupService
{
  constructor(private readonly prisma: PrismaService) {}

  async findProfile(memberId: string): Promise<MemberProfile | undefined> {
    const raw = await this.prisma.member.findUnique({
      where: { id: memberId },
      select: {
        id: true,
        name: true,
        gradeLevel: true,
        deletedAt: true,
      },
    });

    if (!raw || raw.deletedAt !== null) {
      return undefined;
    }

    // 다른 BC의 데이터 → 자기 컨텍스트의 인터페이스로 번역
    return {
      memberId: raw.id,
      displayName: raw.name,
      grade: raw.gradeLevel,
    };
  }
}
```

> ⚠️ 외부 **시스템/기술**(결제 게이트웨이·스토리지·OAuth 등)과의 통신은 LookupService가 아니라 **Port**(`application/ports/` → `infra/adapters/`)다. LookupService는 *우리 DB의 다른 BC 테이블*을 읽는 경우에만 쓴다(`rules/domain.md`).

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
| 역할        | 다른 컨텍스트 데이터 조회 (LookupService) | 같은 컨텍스트 데이터 조회                     |
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
- JSDoc에 역할 명시 (LookupService, 어느 컨텍스트 → 어느 컨텍스트)
- 반환 타입은 Domain에서 정의한 인터페이스만 사용

## 주의사항

- ❌ Domain Entity를 직접 반환하지 않음 (Domain에서 정의한 DTO/인터페이스 반환)
- ❌ 비즈니스 로직 포함 금지 (조회 + 변환만)
- ✅ 존재 확인: boolean 반환 / 데이터 조회: 자기 컨텍스트의 타입으로 번역 (둘 다 LookupService)
- ✅ `select`로 필요한 필드만 조회 (성능 최적화)
