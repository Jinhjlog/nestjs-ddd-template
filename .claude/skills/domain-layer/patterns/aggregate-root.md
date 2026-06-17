# Aggregate Root 작성 패턴

Aggregate Root는 독립적으로 관리되는 애그리게잇의 대표 엔티티입니다.

> ⚠️ **YAGNI (rules/domain.md)**: 처음엔 **`create` / `unsafeCreate` / getter만** 만든다.
> 행위 메서드(`updateXxx`/`changeStatus`/`activate` 등)는 **그것을 실제 호출하는 UseCase가 생기는 시점에** 정확한 시그니처로 추가한다. 아래 예시의 `updateName()`·`changeDepartment()` 같은 행위 메서드는 **"필요해졌을 때 이렇게 추가한다"는 형태 예시**일 뿐, 처음부터 선점하지 않는다.

## 정의

- **상속**: `AggregateRoot<Props>`
- **특징**:
  - 독립적으로 존재 가능
  - Domain Event 발행 가능
  - Repository를 통해 직접 저장/조회

## 표준 생성 패턴

모든 Aggregate Root는 다음 3가지 생성자 패턴을 따릅니다:

1. **`private constructor`**: 외부에서 직접 `new` 호출 금지
2. **`static create()`**: 비즈니스 검증을 포함한 새 엔티티 생성
3. **`static unsafeCreate()`**: Mapper에서 DB 데이터 복원용 (검증 없음)

## create() 파라미터 스타일 가이드

| 스타일                        | 사용 시점                              | 장점                           |
| ----------------------------- | -------------------------------------- | ------------------------------ |
| **`Omit<Props, ...>`** (권장) | 제외할 필드가 적을 때 (id, timestamps) | 가장 간결, Props와 자동 동기화 |
| `Pick<Props, ...>`            | 포함할 필드를 명시적으로 선택할 때     | 명확한 필드 선택               |
| 인라인 객체 `{ field: type }` | 원시값을 받아 VO로 변환할 때           | 외부와 내부 타입 분리          |
| 개별 파라미터                 | 필드가 2~3개로 적을 때                 | 단순함                         |

## 예시 1: Omit<Props, ...>으로 자동 필드 제외 (권장)

Props에서 자동 생성되는 필드(id, timestamps)만 제외하는 가장 간결한 패턴입니다:

```typescript
import {
  AggregateRoot,
  BoundedString,
  Email,
  UniqueEntityId,
} from '@lib/domain';

export interface MemberProps {
  id?: string;
  name: BoundedString;
  email: Email;
  departmentId: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
}

export class Member extends AggregateRoot<MemberProps> {
  private constructor(props: MemberProps) {
    super(props, new UniqueEntityId(props.id));
  }

  get name(): BoundedString {
    return this.props.name;
  }

  get email(): Email {
    return this.props.email;
  }

  get departmentId(): string {
    return this.props.departmentId;
  }

  get isActive(): boolean {
    return this.props.isActive;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  get updatedAt(): Date {
    return this.props.updatedAt;
  }

  get deletedAt(): Date | undefined {
    return this.props.deletedAt;
  }

  /**
   * 새로운 멤버를 생성합니다.
   * Omit으로 id, timestamps를 제외하여 필요한 필드만 받습니다.
   */
  static create(
    props: Omit<MemberProps, 'id' | 'createdAt' | 'updatedAt'>,
  ): Member {
    const now = new Date();
    return new Member({
      ...props,
      createdAt: now,
      updatedAt: now,
    });
  }

  /**
   * DB에서 복원합니다 (Mapper 전용, 검증 없음).
   */
  static unsafeCreate(props: MemberProps): Member {
    return new Member(props);
  }

  /** 이름을 변경합니다. */
  updateName(name: BoundedString): void {
    this.props.name = name;
    this.props.updatedAt = new Date();
  }

  /** 부서를 이동합니다. */
  changeDepartment(departmentId: string): void {
    this.props.departmentId = departmentId;
    this.props.updatedAt = new Date();
  }
}
```

## 예시 2: 원시값을 받는 create()

`create()`가 원시값(string, number)을 받고, 내부에서 Value Object를 생성하는 패턴입니다.
외부에서 VO를 알 필요 없이 원시값만 전달하면 되므로 UseCase 코드가 단순해집니다:

```typescript
import {
  AggregateRoot,
  BoundedString,
  PositiveNumber,
  UniqueEntityId,
} from '@lib/domain';

export interface ProductProps {
  id?: string;
  name: BoundedString;
  description?: string;
  price: PositiveNumber;
  stockQuantity: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export class Product extends AggregateRoot<ProductProps> {
  private constructor(props: ProductProps) {
    super(props, new UniqueEntityId(props.id));
  }

  /**
   * 새로운 상품을 생성합니다.
   * 원시값을 받아 내부에서 Value Object를 생성합니다.
   */
  static create(data: {
    name: string;
    description?: string;
    price: number;
    stockQuantity: number;
  }): Product {
    const now = new Date();
    return new Product({
      name: BoundedString.create(data.name, {
        fieldName: 'name',
        minLength: 1,
        maxLength: 255,
      }),
      description: data.description,
      price: PositiveNumber.create(data.price, {
        fieldName: 'price',
      }),
      stockQuantity: data.stockQuantity,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });
  }

  static unsafeCreate(props: ProductProps): Product {
    return new Product(props);
  }
}
```

## 예시 3: 개별 파라미터를 받는 create()

필드가 2~3개로 적은 간단한 엔티티에서 사용합니다:

```typescript
static create(userId: string, targetId: string): Bookmark {
  const now = new Date();
  return new Bookmark({
    userId,
    targetId,
    createdAt: now,
    updatedAt: now,
  });
}
```

## 예시 4: Pick<Props, ...>로 필드 선택

포함할 필드를 명시적으로 선택하는 패턴입니다:

```typescript
static create(
  props: Pick<CategoryProps, 'name' | 'parentId' | 'level' | 'sortOrder' | 'isActive'>,
): Category {
  const now = new Date();
  return new Category({
    ...props,
    createdAt: now,
    updatedAt: now,
  });
}
```

## 중요 규칙

- Props 인터페이스에서 `id`는 항상 optional (`id?: string`)
- **constructor는 반드시 `private`**
- 모든 getter는 `get` 키워드 사용
- 도메인 메서드는 비즈니스 로직 포함, `updatedAt` 갱신 잊지 않기
- Domain Event 발행 가능 (`this.addDomainEvent()`)
- `@lib/domain`의 Value Objects 적극 활용:
  - `BoundedString`: 길이 제한이 있는 문자열 (minLength, maxLength, allowEmpty, trim 옵션)
  - `Email`: 이메일 형식
  - `Phone`: 전화번호 형식
  - `Integer`: 정수
  - `PositiveNumber`: 양수
  - `Coordinate`: 좌표값

## 원시 투영 (`HasPrimitives`) — 옵트인

커맨드(생성/수정/상태변경) 응답을 **재조회 없이 애그리거트에서 직접** 주려는 경우에만, 그 애그리거트가 `HasPrimitives<P>`(`@lib/domain`)를 **implements** 하고 `toPrimitives()`로 **민감필드(password 등) 제외한 원시 표현**을 반환한다. (`api-response.md §8`)

```typescript
import { AggregateRoot, BoundedString, Email, HasPrimitives, UniqueEntityId } from '@lib/domain';

// XxxPrimitives 타입은 이 애그리거트 파일에 co-locate
export interface AdminPrimitives {
  id: string;
  loginId: string;
  email?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export class Admin
  extends AggregateRoot<AdminProps>
  implements HasPrimitives<AdminPrimitives>
{
  // ...getter, 도메인 메서드...

  toPrimitives(): AdminPrimitives {
    return {
      id: this.id.toString(),
      loginId: this.props.loginId.value,
      email: this.props.email?.value,
      isActive: this.props.isActive,
      createdAt: this.props.createdAt,
      updatedAt: this.props.updatedAt,
      // password 등 민감필드는 의도적으로 제외
    };
  }
}
```

- **base에 abstract로 강제하지 않는다** — 투영이 필요한 애그리거트만 옵트인. (① 모든 모델이 응답 투영 불필요 ② 충실한 전체 스냅샷 ≠ 안전한 공개 투영 ③ 민감필드 누수 표면 축소. `rules/domain.md`)
- UseCase는 `aggregate.toPrimitives()`를 반환, presentation은 쿼리 ReadModel과 **분리된** `fromPrimitives`로 응답 DTO에 매핑.

## Entity와 구분

| 구분         | Aggregate Root         | Entity (하위)         |
| ------------ | ---------------------- | --------------------- |
| 상속         | `AggregateRoot<Props>` | `EntityClass<Props>`  |
| 독립성       | 독립적 존재 가능       | 부모 Aggregate에 종속 |
| Repository   | 직접 저장/조회         | 부모를 통해 접근      |
| Domain Event | 발행 가능              | 발행 불가             |

## 하위 컬렉션 관리 (추가/제거 추적)

Aggregate가 하위 Entity 컬렉션(첨부파일·항목 등)을 가질 때, **제거 의도를 명시적으로 추적**한다.
이 추적값이 Repository의 삭제 입력이 된다 (`patterns/repository-impl.md` 패턴2의 `removedXxxIds`).

> ⚠️ **`notIn` orphan removal 금지.** Repository에서 `deleteMany({ where: { parentId, NOT: { id: { in: 현재ID들 } } } })` 로 "현재 집합에 없는 것 전부 삭제"하면, **동시 저장 시 다른 요청이 방금 추가한 행을 phantom delete** 한다(stale 스냅샷 기반 삭제). 트랜잭션으로도 못 막는다.
> → Aggregate가 **제거한 ID만** 추적하고 Repository는 **그 ID만** 삭제한다.

```typescript
export class Order extends AggregateRoot<OrderProps> {
  // 이번 변경에서 제거된 하위 Entity ID (DB 삭제 대상)
  private _removedItemIds: string[] = [];
  // (선택) 제거된 외부 리소스 키 — 스토리지 파일 등 정리가 필요할 때
  private _removedStorageKeys: string[] = [];

  private constructor(props: OrderProps) {
    super(props, new UniqueEntityId(props.id));
  }

  // getter는 readonly로 노출해 외부에서 배열을 직접 변경하지 못하게 한다
  get items(): readonly OrderItem[] {
    return this.props.items;
  }

  get removedItemIds(): readonly string[] {
    return this._removedItemIds;
  }

  get removedStorageKeys(): readonly string[] {
    return this._removedStorageKeys;
  }

  /** 영속화 완료 후 추적 상태 초기화 (Repository가 save 성공 후 호출) */
  // 이름은 주 추적 대상(ID 배열) 기준으로 짓고, 부수 추적(storageKeys)도 함께 비운다.
  clearRemovedItemIds(): void {
    this._removedItemIds = [];
    this._removedStorageKeys = [];
  }

  /** 항목 추가 (이미 존재하는 ID는 중복 추가하지 않음) */
  addItems(items: OrderItem[]): void {
    const fresh = items.filter(
      (item) => !this.props.items.some((e) => e.id.equals(item.id)),
    );
    this.props.items.push(...fresh);
    this.props.updatedAt = new Date();
  }

  /** 항목 제거 + 삭제 대상으로 기록 */
  removeItems(itemIds: string[]): void {
    const removeSet = new Set(itemIds);
    this.props.items = this.props.items.filter((item) => {
      if (!removeSet.has(item.id.toString())) {
        return true;
      }
      this._removedItemIds.push(item.id.toString()); // 삭제 "의도"를 추적
      if (item.storageKey) {
        this._removedStorageKeys.push(item.storageKey);
      }
      return false;
    });
    this.props.updatedAt = new Date();
  }
}
```

### 규칙

- **`this.props.items = newArray` 직접 대입 금지** → 제거 추적이 누락돼 Repository가 삭제하지 못한다. 전체 교체가 필요하면 `removeItems(빠진 것) + addItems(새 것)` 로 표현한다. (현재 집합과 diff하여 제거분을 추적하는 단일 메서드도 가능)
- 하위 컬렉션 getter는 **`readonly` 배열**로 노출해 메서드를 통하지 않은 변경을 막는다.
- `clearRemovedXxxIds()` 는 **트랜잭션 성공 후** 호출한다(롤백 시 추적 보존 → 재시도 안전). 스토리지 정리가 필요한 UseCase는 `save()` **전에** `removedStorageKeys` 를 캡처해 DB 커밋 성공 후 실제 스토리지를 삭제한다(캡처 안 하면 `save()`가 비워 유실).
- 추가만 있고 제거가 없는 append-only 컬렉션(예: 로그·댓글)은 제거 추적 없이 `upsert`만 하고 삭제 단계를 두지 않는다.
