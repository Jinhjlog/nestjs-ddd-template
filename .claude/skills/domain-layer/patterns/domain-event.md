# Domain Event 작성 패턴

Domain Event는 도메인에서 발생하는 중요한 이벤트를 표현합니다.

## IDomainEvent 인터페이스

```typescript
// @lib/domain/events/i-domain-event.ts
export interface IDomainEvent<T = Record<string, any>> {
  dateTimeOccurred: Date;
  getAggregateId(): UniqueEntityId;
  metadata?: T;
}
```

- **제네릭 `T`**: 이벤트 메타데이터 타입을 지정합니다.
- **`metadata`**: `payload`가 아닌 `metadata` 프로퍼티를 사용합니다.

## 실제 코드 예시 (LectureCompletedEvent)

```typescript
import { UniqueEntityId } from '@lib/domain';
import { IDomainEvent } from '@lib/domain/events/i-domain-event';

export interface LectureCompletedEventMetadata {
  userId: string;
  lectureId: string;
  courseId: string;
}

export class LectureCompletedEvent
  implements IDomainEvent<LectureCompletedEventMetadata>
{
  public dateTimeOccurred: Date;
  public metadata: LectureCompletedEventMetadata;

  constructor(
    private readonly aggregateId: UniqueEntityId,
    metadata: LectureCompletedEventMetadata,
  ) {
    this.dateTimeOccurred = new Date();
    this.metadata = metadata;
  }

  getAggregateId(): UniqueEntityId {
    return this.aggregateId;
  }
}
```

## 기본 템플릿

```typescript
import { UniqueEntityId } from '@lib/domain';
import { IDomainEvent } from '@lib/domain/events/i-domain-event';

export interface {EventName}EventMetadata {
  // 이벤트에 필요한 데이터
  fieldName: string;
}

export class {EventName}Event
  implements IDomainEvent<{EventName}EventMetadata>
{
  public dateTimeOccurred: Date;
  public metadata: {EventName}EventMetadata;

  constructor(
    private readonly aggregateId: UniqueEntityId,
    metadata: {EventName}EventMetadata,
  ) {
    this.dateTimeOccurred = new Date();
    this.metadata = metadata;
  }

  getAggregateId(): UniqueEntityId {
    return this.aggregateId;
  }
}
```

## 중요 규칙

- **`IDomainEvent<T>` 제네릭** 사용: `implements IDomainEvent<{EventName}EventMetadata>`
- **`metadata` 프로퍼티** 사용 (`payload` 아님)
- **인터페이스명**: `{EventName}EventMetadata` (`{EventName}Payload` 아님)
- `dateTimeOccurred` 필드 필수
- `getAggregateId()` 메서드 구현
- metadata는 constructor에서 필수 파라미터로 받음

## 이벤트 발행 방법

Aggregate Root에서 도메인 행위 메서드 내부에서 발행합니다:

```typescript
export class LectureProgress extends AggregateRoot<LectureProgressProps> {
  markAsCompleted(courseId: string): void {
    this.props.isCompleted = true;
    this.props.updatedAt = new Date();

    // Domain Event 발행
    this.addDomainEvent(
      new LectureCompletedEvent(this.id, {
        userId: this.props.userId,
        lectureId: this.id.toString(),
        courseId,
      }),
    );
  }
}
```

## 이벤트 디스패치

디스패치는 **Repository.save()가 책임진다** — 저장 성공 직후(트랜잭션 밖)에 한 번 비워준다. **UseCase는 `save()`만 호출**하면 되고 별도 디스패치 호출을 하지 않는다(이중 디스패치·누락 방지).

> `AggregateRoot.addDomainEvent()`가 이미 `DomainEvents.markAggregateForDispatch(this)`로 대상 등록을 해두므로(`@lib/domain/aggregate-root.ts`), 실제 발행 트리거는 Repository 한 곳이면 충분하다. (참조: `infrastructure-layer/patterns/repository-impl.md`)

```typescript
// Repository.save() 내부 — 저장 성공 직후 디스패치
await this.prisma.user.upsert({ ... });

if (entity.domainEvents.length > 0) {
  DomainEvents.dispatchEventsForAggregate(entity.id);
}
```

```typescript
// UseCase는 save()만 호출 — 디스패치 호출 없음
await this.repository.save(entity);
```
