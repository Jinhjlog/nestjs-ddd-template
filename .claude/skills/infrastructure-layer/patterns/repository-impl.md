# Repository 구현체 작성 패턴

Repository 구현체는 Domain Repository 인터페이스를 Prisma로 구현합니다.

## 패턴 1: 단일 Aggregate Root (트랜잭션 없음)

하위 Entity가 없는 경우, 트랜잭션 없이 직접 upsert합니다.

```typescript
import { Injectable } from '@nestjs/common';
import { ProductRepository } from '../../domain/repositories';
import { Product } from '../../domain/models';
import { PrismaService } from '@core/database/prisma.service';
import { ProductMapper } from '../mappers';
import { DomainEvents } from '@lib/domain/events/domain-events';

@Injectable()
export class ProductRepositoryImpl implements ProductRepository {
  constructor(private readonly prisma: PrismaService) {}

  async save(entity: Product): Promise<void> {
    const data = ProductMapper.toPersistence(entity);

    await this.prisma.product.upsert({
      where: { id: data.id },
      create: data,
      update: data,
    });

    if (entity.domainEvents.length > 0) {
      DomainEvents.dispatchEventsForAggregate(entity.id);
    }
  }

  async findById(id: string): Promise<Product | undefined> {
    const raw = await this.prisma.product.findUnique({
      where: { id },
    });
    if (!raw) {
      return undefined;
    }

    return ProductMapper.toDomain(raw);
  }

  async delete(id: string): Promise<void> {
    await this.prisma.product.delete({
      where: { id },
    });
  }
}
```

## 패턴 2: 하위 Entity 포함 (트랜잭션 사용)

하위 Entity가 있는 경우에만 `$transaction`을 사용합니다. Orphan Removal은 Aggregate Root가 **명시적으로 추적하는 `removedXxxIds`** 기반으로 처리합니다.

```typescript
import { Injectable } from '@nestjs/common';
import { OrderRepository } from '../../domain/repositories';
import { Order } from '../../domain/models';
import { PrismaService } from '@core/database/prisma.service';
import { OrderMapper, OrderItemMapper } from '../mappers';
import { DomainEvents } from '@lib/domain/events/domain-events';

@Injectable()
export class OrderRepositoryImpl implements OrderRepository {
  constructor(private readonly prisma: PrismaService) {}

  async save(entity: Order): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      // 1. Aggregate Root 저장
      const orderData = OrderMapper.toPersistence(entity);
      await tx.order.upsert({
        where: { id: entity.id.toString() },
        update: orderData,
        create: orderData,
      });

      // 2. 명시적으로 삭제 요청된 하위 Entity만 삭제
      const removedItemIds = entity.removedItemIds;
      if (removedItemIds.length > 0) {
        await tx.orderItem.deleteMany({
          where: { id: { in: [...removedItemIds] } },
        });
        entity.clearRemovedItemIds();
      }

      // 3. 하위 Entity 저장/업데이트 (배치 처리)
      if (entity.items.length > 0) {
        await Promise.all(
          entity.items.map(async (item) => {
            const itemData = OrderItemMapper.toPersistence(item);
            await tx.orderItem.upsert({
              where: { id: item.id.toString() },
              update: itemData,
              create: itemData,
            });
          }),
        );
      }
    });

    // Domain Events 발행 (트랜잭션 밖에서)
    if (entity.domainEvents.length > 0) {
      DomainEvents.dispatchEventsForAggregate(entity.id);
    }
  }

  async findById(id: string): Promise<Order | undefined> {
    const raw = await this.prisma.order.findUnique({
      where: { id },
      include: {
        items: { orderBy: { sortOrder: 'asc' } },
      },
    });

    if (!raw) {
      return undefined;
    }

    // 하위 Entity를 추가 인자로 전달
    return OrderMapper.toDomain(raw, raw.items);
  }

  async delete(id: string): Promise<void> {
    await this.prisma.order.delete({
      where: { id },
    });
  }
}
```

## 패턴 3: 복합 유니크 키 upsert

`userId + courseId` 같은 복합 유니크 키로 upsert하는 패턴:

```typescript
@Injectable()
export class EnrollmentRepositoryImpl implements EnrollmentRepository {
  constructor(private readonly prisma: PrismaService) {}

  async save(entity: Enrollment): Promise<void> {
    const data = EnrollmentMapper.toPersistence(entity);
    await this.prisma.enrollment.upsert({
      where: {
        // 복합 유니크 키: Prisma 스키마의 @@unique([userId, courseId])
        userId_courseId: {
          userId: data.userId,
          courseId: data.courseId,
        },
      },
      update: data,
      create: data,
    });

    if (entity.domainEvents.length > 0) {
      DomainEvents.dispatchEventsForAggregate(entity.id);
    }
  }

  async findByUserAndCourse(
    userId: string,
    courseId: string,
  ): Promise<Enrollment | undefined> {
    const result = await this.prisma.enrollment.findUnique({
      where: {
        userId_courseId: { userId, courseId },
      },
    });
    if (!result) return undefined;
    return EnrollmentMapper.toDomain(result);
  }
}
```

## 패턴 4: existsBy (존재 확인)

`count() > 0` 패턴으로 존재 확인:

```typescript
async existsByEmail(email: Email): Promise<boolean> {
  const count = await this.prisma.member.count({
    where: { email: email.value },
  });
  return count > 0;
}
```

## 패턴 5: createMany (배치 생성)

대량 데이터를 한 번에 생성하는 패턴:

```typescript
async createMany(entities: Member[]): Promise<void> {
  const data = entities.map((entity) => MemberMapper.toPersistence(entity));
  await this.prisma.member.createMany({ data });
}
```

## 트랜잭션 사용 조건

| 조건                       | 트랜잭션                  | 예시              |
| -------------------------- | ------------------------- | ----------------- |
| 단일 Aggregate Root만 저장 | 불필요                    | Product, Member   |
| 하위 Entity 포함 저장      | **필요** (`$transaction`) | Order + OrderItem |

## 중요 규칙

- `@Injectable()` 데코레이터 필수
- Domain Repository 인터페이스 `implements` 구현
- PrismaService 주입
- Domain Events는 **저장 후** (트랜잭션 밖에서) 발행
- `findById()`에서 하위 Entity는 `include`로 함께 조회
- upsert 패턴: `where: { id }`, `create: data`, `update: data`

## 주의사항

- ❌ Repository에서 비즈니스 로직 포함 금지
- ❌ 단일 Entity 저장에 불필요한 트랜잭션 사용 금지
- ❌ `notIn`으로 Orphan Removal 금지 → `removedXxxIds` 추적 방식 사용
- ✅ Domain Events 발행은 트랜잭션 **밖에서**
- ✅ 하위 Entity는 `Promise.all` + `upsert`로 배치 처리
