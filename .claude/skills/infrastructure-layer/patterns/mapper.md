# Mapper 작성 패턴

Mapper는 Prisma 모델과 Domain 모델 간의 변환을 담당합니다.

## Aggregate Root Mapper (단순)

하위 Entity 없이 단순 Aggregate Root만 매핑하는 패턴:

```typescript
import { Prisma, Product as ProductPrisma } from '@prisma/generated/client';
import { Product } from '../../domain/models';
import { BoundedString, PositiveNumber } from '@lib/domain';

export class ProductMapper {
  static toDomain(raw: ProductPrisma): Product {
    return Product.unsafeCreate({
      id: raw.id,
      name: BoundedString.unsafeCreate(raw.name),
      description: raw.description !== null ? raw.description : undefined, // null → undefined
      price: PositiveNumber.unsafeCreate(raw.price, 'price'),
      stockQuantity: raw.stockQuantity,
      isActive: raw.isActive,
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
      deletedAt: raw.deletedAt !== null ? raw.deletedAt : undefined,
    });
  }

  static toPersistence(domain: Product): Prisma.ProductUncheckedCreateInput {
    return {
      id: domain.id.toString(),
      name: domain.name.value,
      description: domain.description !== undefined ? domain.description : null, // undefined → null
      price: domain.price.value,
      stockQuantity: domain.stockQuantity,
      isActive: domain.isActive,
      createdAt: domain.createdAt,
      updatedAt: domain.updatedAt,
      deletedAt: domain.deletedAt !== undefined ? domain.deletedAt : null,
    };
  }
}
```

## Aggregate Root Mapper (하위 Entity 포함)

하위 Entity를 함께 매핑하는 패턴. `toDomain()`이 추가 인자로 하위 Entity 목록을 받습니다:

```typescript
import {
  Prisma,
  Order as OrderPrisma,
  OrderItem as OrderItemPrisma,
} from '@prisma/generated/client';
import { BoundedString } from '@lib/domain';
import { Order } from '../../domain/models';
import { OrderItemMapper } from './order-item.mapper';

export class OrderMapper {
  /**
   * toDomain - 추가 인자로 하위 Entity 목록을 받습니다
   */
  static toDomain(raw: OrderPrisma, rawItems: OrderItemPrisma[] = []): Order {
    const items = rawItems.map((item) => OrderItemMapper.toDomain(item));

    return Order.unsafeCreate({
      id: raw.id,
      customerId: raw.customerId,
      status: raw.status,
      totalAmount: raw.totalAmount,
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
      items,
    });
  }

  static toPersistence(domain: Order): Prisma.OrderUncheckedCreateInput {
    return {
      id: domain.id.toString(),
      customerId: domain.customerId, // FK 직접 설정 (connect 아님)
      status: domain.status,
      totalAmount: domain.totalAmount,
      createdAt: domain.createdAt,
      updatedAt: domain.updatedAt,
    };
  }
}
```

## 하위 Entity Mapper

Aggregate Root에 포함된 하위 Entity 매핑. 부모 Aggregate ID가 필수입니다:

```typescript
import { Prisma, OrderItem as OrderItemPrisma } from '@prisma/generated/client';
import { BoundedString } from '@lib/domain';
import { OrderItem } from '../../domain/models';

export class OrderItemMapper {
  static toDomain(raw: OrderItemPrisma): OrderItem {
    return OrderItem.unsafeCreate({
      id: raw.id,
      orderId: raw.orderId, // 부모 Aggregate ID
      productName: BoundedString.unsafeCreate(raw.productName),
      quantity: raw.quantity,
      unitPrice: raw.unitPrice,
      sortOrder: raw.sortOrder,
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
    });
  }

  static toPersistence(
    domain: OrderItem,
  ): Prisma.OrderItemUncheckedCreateInput {
    return {
      id: domain.id.toString(),
      orderId: domain.orderId, // FK 직접 설정 (connect 아님)
      productName: domain.productName.value,
      quantity: domain.quantity,
      unitPrice: domain.unitPrice,
      sortOrder: domain.sortOrder,
      createdAt: domain.createdAt,
      updatedAt: domain.updatedAt,
    };
  }
}
```

## Enum/커스텀 Value Object 변환 패턴

> **Prisma enum 컬럼 캐스팅**: `toPersistence`에서 VO `.value`(string)를 Prisma **enum 컬럼**에 넣을 때 타입 불일치가 나면 `status: domain.status.value as <prisma_enum_type>` 로 캐스팅한다. (QueryService의 `where` 필터도 동일: `where.status = params.status as <prisma_enum_type>`)

Enum이나 커스텀 VO를 `unsafeCreate()`로 변환하는 패턴:

```typescript
export class MemberMapper {
  static toDomain(raw: MemberPrisma): Member {
    return Member.unsafeCreate({
      id: raw.id,
      name: BoundedString.unsafeCreate(raw.name),
      email: raw.email !== null ? Email.unsafeCreate(raw.email) : undefined,
      phone: raw.phone !== null ? Phone.unsafeCreate(raw.phone) : undefined,
      // 커스텀 VO도 unsafeCreate() 사용
      role: MemberRole.unsafeCreate(raw.role),
      password: Password.unsafeCreate(raw.passwordHash, true),
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
    });
  }

  static toPersistence(domain: Member): Prisma.MemberUncheckedCreateInput {
    return {
      id: domain.id.toString(),
      name: domain.name.value,
      email: domain.email !== undefined ? domain.email.value : null,
      phone: domain.phone !== undefined ? domain.phone.value : null,
      role: domain.role.value,
      passwordHash: domain.password.value,
      createdAt: domain.createdAt,
      updatedAt: domain.updatedAt,
    };
  }
}
```

## 중요 규칙

### toDomain() 메서드

- `Entity.unsafeCreate()` 사용: DB 데이터는 이미 검증되었으므로 validation 스킵
- Value Objects: `BoundedString.unsafeCreate()`, `Phone.unsafeCreate()` 등
- Nullable → Optional: `raw.field !== null ? raw.field : undefined` (삼항 연산자 필수)
- 커스텀 VO/Enum: `CustomVO.unsafeCreate(raw.value)` 사용
- 하위 Entity 인자: `toDomain(prismaRoot, prismaChildren)` 패턴

### toPersistence() 메서드

- 반환 타입: **`Prisma.{Entity}UncheckedCreateInput`** (FK를 직접 설정)
- Value Objects: `.value` 접근
- Optional → Nullable: `domain.field !== undefined ? domain.field.value : null` (삼항 연산자 필수)
- FK 관계: **`connect` 사용 금지** → FK ID 직접 설정 (UncheckedCreateInput)
- UniqueEntityId: `.toString()` 변환

### null ↔ undefined 변환

| 방향                               | 변환                | 예시                                                   |
| ---------------------------------- | ------------------- | ------------------------------------------------------ |
| Prisma → Domain (null → undefined) | 삼항 연산자 필수    | `raw.field !== null ? raw.field : undefined`           |
| Domain → Prisma (undefined → null) | 삼항 연산자 필수    | `domain.field !== undefined ? domain.field : null`     |
| Nullable VO (Prisma → Domain)      | 삼항 + unsafeCreate | `field !== null ? VO.unsafeCreate(field) : undefined`  |
| Optional VO (Domain → Prisma)      | 삼항 연산자 필수    | `domain.name !== undefined ? domain.name.value : null` |

## 타입 변환 규칙

| Domain 타입          | Prisma 타입      | toDomain 변환                                     | toPersistence 변환             |
| -------------------- | ---------------- | ------------------------------------------------- | ------------------------------ |
| `BoundedString`      | `string`         | `BoundedString.unsafeCreate(field)`               | `.value`                       |
| `Email`              | `string`         | `Email.unsafeCreate(field)`                       | `.value`                       |
| `Phone`              | `string`         | `Phone.unsafeCreate(field)`                       | `.value`                       |
| `Password`           | `string`         | `Password.unsafeCreate(field, true)`              | `.value`                       |
| `PositiveNumber`     | `number`         | `PositiveNumber.unsafeCreate(field, 'fieldName')` | `.value`                       |
| 커스텀 VO            | `string`/`enum`  | `CustomVO.unsafeCreate(field)`                    | `.value`                       |
| `UniqueEntityId`     | `string`         | 그대로 (id 필드)                                  | `.toString()`                  |
| `Date`               | `Date`           | 그대로                                            | 그대로                         |
| `number`             | `number`         | 그대로                                            | 그대로                         |
| `boolean`            | `boolean`        | 그대로                                            | 그대로                         |
| `string?` (nullable) | `string \| null` | `!== null ? field : undefined`                    | `!== undefined ? field : null` |

## 주의사항

- ❌ Mapper에서 비즈니스 로직 포함 금지
- ❌ `connect: { id: ... }` 사용 금지 → `UncheckedCreateInput` + FK 직접 설정
- ✅ toDomain에서는 항상 `unsafeCreate()` 사용
- ✅ toPersistence 반환 타입: `Prisma.{Entity}UncheckedCreateInput`
- ✅ null ↔ undefined 변환 명시
