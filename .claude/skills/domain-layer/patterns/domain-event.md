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

Repository의 `save()` 이후 Application 레이어에서 디스패치합니다:

```typescript
// UseCase에서
await this.repository.save(entity);
DomainEvents.dispatchEventsForAggregate(entity.id);
```
