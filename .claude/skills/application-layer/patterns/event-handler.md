# Event Handler 작성 패턴

Event Handler는 Domain Event를 구독하여 부수 효과를 처리합니다. 주로 크로스 모듈 이벤트를 수신합니다.

## 기본 구조

```typescript
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { DomainEvents } from '@lib/domain/events/domain-events';
import { LectureCompletedEvent } from 'src/module/learning-progress/domain/events';

@Injectable()
export class LectureCompletedEventHandler implements OnModuleInit {
  private readonly logger = new Logger(LectureCompletedEventHandler.name);

  constructor(
    private readonly handleLectureCompleted: HandleLectureCompletedUseCase,
  ) {}

  onModuleInit() {
    DomainEvents.register(
      (event: LectureCompletedEvent) => void this.handle(event),
      LectureCompletedEvent.name,
    );
  }

  async handle(event: LectureCompletedEvent): Promise<void> {
    try {
      const { userId, courseId } = event.metadata;

      await this.handleLectureCompleted.execute(userId, courseId);
    } catch (error) {
      // 핸들러는 예외를 상위로 전파하지 않고 로깅으로 마감 (프로젝트 로깅 관례 = Nest Logger)
      this.logger.error('과정 수료 판정 실패', error);
    }
  }
}
```

## 핵심 규칙

| 항목            | 규칙                                               |
| --------------- | -------------------------------------------------- |
| 데코레이터      | `@Injectable()` + `implements OnModuleInit`        |
| 등록 위치       | `onModuleInit()` → `DomainEvents.register()`       |
| 이벤트 데이터   | `event.metadata` (~~event.payload~~ 사용 금지)     |
| handle 시그니처 | `async handle(event): Promise<void>`               |
| 비동기 호출     | `void this.handle(event)` (register 콜백 내)       |
| 에러 처리       | `try-catch` + `this.logger.error()` (Nest Logger — `console` 금지) |
| 디렉토리        | `application/event-handlers/` (~~handlers/~~ 아님) |
| 파일명          | `{event-name}.event-handler.ts`                    |

## Domain Event 구조

Event Handler가 수신하는 Domain Event의 구조:

```typescript
// domain/events/lecture-completed.event.ts

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

### Event 발행 (Entity 내부)

```typescript
// Entity 도메인 메서드에서 이벤트 생성
this.addDomainEvent(
  new LectureCompletedEvent(this.id, {
    userId: this.props.userId,
    lectureId: this.props.lectureId,
    courseId,
  }),
);
```

### Event Dispatch (Repository)

```typescript
// Repository.save() 후 이벤트 디스패치
if (entity.domainEvents.length > 0) {
  DomainEvents.dispatchEventsForAggregate(entity.id);
}
```

## 크로스 모듈 이벤트 구독

다른 모듈의 Domain Event를 구독할 때:

```typescript
// course-completion 모듈에서 learning-progress 모듈의 이벤트 구독
import { LectureCompletedEvent } from 'src/module/learning-progress/domain/events';
```

- 이벤트 import는 **절대 경로** 사용 (`src/module/...`)
- `../../domain/events`가 아닌 **다른 모듈의 domain/events**에서 import

## 에러 처리 패턴

Event Handler는 예외를 상위로 전파하지 않습니다.

```typescript
async handle(event: LectureCompletedEvent): Promise<void> {
  try {
    const { userId, courseId } = event.metadata;
    await this.handleLectureCompleted.execute(userId, courseId);
  } catch (error) {
    // 에러 로그만 기록, 예외 전파 안 함 (Nest Logger 사용 — console 금지)
    this.logger.error('과정 수료 판정 실패', error);
  }
}
```

## 사용 시나리오

- 과정 수료 판정 (차시 완료 → 전체 과정 수료 확인)
- 알림 발송 (상태 변경 → 알림 생성)
- 통계 업데이트 (데이터 변경 → 집계 갱신)
- 다른 Aggregate 업데이트

## 주의사항

- `event.metadata` 사용 (`event.payload` 아님)
- `async handle(): Promise<void>` (동기 `void` 아님)
- Event Handler에서 직접 Repository 호출 지양 → UseCase를 통해 처리
- 디렉토리명: `event-handlers/` (`handlers/` 아님)
- Module 파일에 Handler를 `providers`에 등록 필수
