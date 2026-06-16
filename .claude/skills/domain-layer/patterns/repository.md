# Repository Interface 작성 패턴

Repository는 도메인 엔티티의 저장소 인터페이스입니다. NestJS DI에서 토큰으로 사용하기 위해 `interface`가 아닌 `abstract class`로 정의합니다.

## 기본 패턴

가장 일반적인 Repository입니다. `save`, `findById`, `delete`를 기본으로 제공합니다:

```typescript
import { Product } from '../models';

/**
 * 상품 저장소
 */
export abstract class ProductRepository {
  /** 상품을 저장합니다 (생성/수정 겸용). */
  abstract save(entity: Product): Promise<void>;

  /** ID로 상품을 조회합니다. */
  abstract findById(id: string): Promise<Product | undefined>;

  /** 상품을 삭제합니다. */
  abstract delete(id: string): Promise<void>;
}
```

## Value Object를 파라미터로 받는 패턴

도메인 레이어의 타입 안전성을 위해 조회 조건에 Value Object를 사용할 수 있습니다:

```typescript
import { Email } from '@lib/domain';
import { Member } from '../models';

/**
 * 멤버 저장소
 */
export abstract class MemberRepository {
  abstract save(entity: Member): Promise<void>;
  abstract findById(id: string): Promise<Member | undefined>;

  /** 이메일로 멤버를 조회합니다. */
  abstract findByEmail(email: Email): Promise<Member | undefined>;

  /** 해당 이메일이 이미 사용 중인지 확인합니다. */
  abstract existsByEmail(email: Email): Promise<boolean>;
}
```

## 복합 키 조회 패턴

2개 이상의 키로 조회하는 경우입니다:

```typescript
import { Enrollment } from '../models';

/**
 * 수강 등록 저장소
 */
export abstract class EnrollmentRepository {
  abstract save(entity: Enrollment): Promise<void>;

  /** 사용자 + 강좌 복합 키로 조회합니다. */
  abstract findByUserAndCourse(
    userId: string,
    courseId: string,
  ): Promise<Enrollment | undefined>;
}
```

## 중요 규칙

- **abstract class** 사용 (NestJS DI 토큰 역할)
- **abstract 메서드만** 정의 (구현 로직 없음)
- **도메인 엔티티 타입** 사용 (Prisma 타입 사용 금지)
- 반환 타입에서 존재하지 않을 수 있는 경우 **`undefined` 사용** (`null` 아님)
- Value Object를 파라미터로 받을 수 있음
- **간결하게 유지** (복잡한 목록/상세 조회는 Query Service로 분리)
- **커맨드의 자기 컨텍스트 존재/스코프 확인**(`existsBy...`/`findByIdAndOwner` 등)은 QueryService가 아니라 **여기(Repository)** 에 둔다 — 커맨드는 읽기 측(QueryService)에 의존하지 않는다(CQRS, `rules/domain.md`).

## Repository vs Query Service

| 구분        | Repository                         | Query Service                                   |
| ----------- | ---------------------------------- | ----------------------------------------------- |
| 용도        | 저장, 단일 조회, 존재 확인, 삭제   | 복잡한 목록/상세 조회                           |
| 반환 타입   | 도메인 엔티티                      | ReadModel                                       |
| 주요 메서드 | `save()`, `findById()`, `delete()` | `findList()`, `countList()`, `findDetailById()` |
| 위치        | `domain/repositories/`             | `domain/services/`                              |
