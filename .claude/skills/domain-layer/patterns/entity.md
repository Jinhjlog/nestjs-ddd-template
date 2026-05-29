# Entity (하위 엔티티) 작성 패턴

Entity는 Aggregate Root에 종속되는 하위 엔티티입니다.

## 정의

- **상속**: `EntityClass<Props>`
- **특징**:
  - 부모 Aggregate 없이 존재 불가
  - 부모 Aggregate ID 필드 필수
  - 부모를 통해서만 접근

## 표준 생성 패턴

Aggregate Root와 동일하게 `private constructor` + `static create()` + `static unsafeCreate()` 패턴을 따릅니다.

## 예시 1: CreateProps와 Props를 분리하는 패턴

`create()`가 원시값을 받고 내부에서 VO로 변환할 때 CreateProps를 별도로 정의합니다:

```typescript
import { EntityClass, BoundedString, UniqueEntityId } from '@lib/domain';

/**
 * OrderItem 생성용 Props (원시값)
 * create() 메서드에서 사용합니다.
 */
export interface OrderItemCreateProps {
  orderId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  sortOrder: number;
}

/**
 * OrderItem 도메인 Props (Value Object 포함)
 */
export interface OrderItemProps {
  id?: string;
  orderId: string; // 부모 Aggregate ID (필수)
  productName: BoundedString; // Value Object
  quantity: number;
  unitPrice: number;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

export class OrderItem extends EntityClass<OrderItemProps> {
  private constructor(props: OrderItemProps) {
    super(props, new UniqueEntityId(props.id));
  }

  // 부모 Aggregate ID getter (필수)
  get orderId(): string {
    return this.props.orderId;
  }

  get productName(): BoundedString {
    return this.props.productName;
  }

  get quantity(): number {
    return this.props.quantity;
  }

  get unitPrice(): number {
    return this.props.unitPrice;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  get updatedAt(): Date {
    return this.props.updatedAt;
  }

  /**
   * 새로운 OrderItem을 생성합니다.
   * 원시값(CreateProps)을 받아 내부에서 Value Object로 변환합니다.
   */
  static create(props: OrderItemCreateProps): OrderItem {
    const now = new Date();
    return new OrderItem({
      orderId: props.orderId,
      productName: BoundedString.create(props.productName, {
        fieldName: 'productName',
        minLength: 1,
        maxLength: 255,
      }),
      quantity: props.quantity,
      unitPrice: props.unitPrice,
      sortOrder: props.sortOrder,
      createdAt: now,
      updatedAt: now,
    });
  }

  /**
   * DB에서 복원합니다 (Mapper 전용, 검증 없음).
   */
  static unsafeCreate(props: OrderItemProps): OrderItem {
    return new OrderItem(props);
  }

  /** 수량을 변경합니다. */
  updateQuantity(quantity: number): void {
    this.props.quantity = quantity;
    this.props.updatedAt = new Date();
  }
}
```

## 예시 2: Props만 사용하는 간단한 Entity

VO 변환 없이 Props를 그대로 받는 간단한 패턴입니다:

```typescript
import { EntityClass, UniqueEntityId } from '@lib/domain';

export interface AttachmentProps {
  id?: string;
  parentId: string; // 부모 Aggregate ID (필수)
  fileName: string;
  fileUrl: string;
  fileSize: number;
  mimeType: string;
  createdAt: Date;
}

export class Attachment extends EntityClass<AttachmentProps> {
  private constructor(props: AttachmentProps) {
    super(props, new UniqueEntityId(props.id));
  }

  get parentId(): string {
    return this.props.parentId;
  }

  get fileName(): string {
    return this.props.fileName;
  }

  get fileUrl(): string {
    return this.props.fileUrl;
  }

  static create(props: Omit<AttachmentProps, 'id' | 'createdAt'>): Attachment {
    return new Attachment({
      ...props,
      createdAt: new Date(),
    });
  }

  static unsafeCreate(props: AttachmentProps): Attachment {
    return new Attachment(props);
  }
}
```

## CreateProps vs Props 분리 패턴

| 인터페이스            | 용도                       | 타입                            |
| --------------------- | -------------------------- | ------------------------------- |
| `{Entity}CreateProps` | `create()` 메서드 파라미터 | 원시값 (string, number)         |
| `{Entity}Props`       | Entity 내부 상태           | Value Object (BoundedString 등) |

- **CreateProps 필요**: `create()`가 원시값을 받아 내부에서 VO로 변환할 때
- **CreateProps 불필요**: `create()`가 Omit/Pick 또는 개별 파라미터를 받을 때

## 중요 규칙

- `EntityClass<Props>` 상속 (AggregateRoot 아님!)
- **constructor는 `private`**
- 부모 Aggregate ID 필드 필수 (예: `orderId`, `parentId`)
- `static create()` + `static unsafeCreate()` 패턴 적용
- Domain Event 발행 불가 (부모 Aggregate Root에서 발행)

## Aggregate Root와 구분

| 구분         | Aggregate Root         | Entity (하위)         |
| ------------ | ---------------------- | --------------------- |
| 상속         | `AggregateRoot<Props>` | `EntityClass<Props>`  |
| 독립성       | 독립적 존재 가능       | 부모 Aggregate에 종속 |
| 필수 필드    | -                      | 부모 Aggregate ID     |
| Repository   | 직접 저장/조회         | 부모를 통해 접근      |
| Domain Event | 발행 가능              | 발행 불가             |
