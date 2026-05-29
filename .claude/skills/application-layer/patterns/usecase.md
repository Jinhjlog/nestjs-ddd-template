# UseCase 작성 패턴

UseCase는 비즈니스 유즈케이스를 실행하는 애플리케이션 서비스입니다. 도메인 메서드를 오케스트레이션하고, ReadModel 또는 결과 DTO를 반환합니다.

## 패턴 1: Command UseCase (생성)

Entity의 `create()` 정적 메서드를 호출하여 생성합니다.

```typescript
import { Injectable } from '@nestjs/common';
import { SignUpUserDto } from '../dtos';
import { BoundedString } from '@lib/domain';
import { User } from '../../domain/models';
import { UserRepository } from '../../domain/repositories';

@Injectable()
export class SignUpUserUseCase {
  constructor(private readonly userRepository: UserRepository) {}

  async execute(dto: SignUpUserDto): Promise<{ userId: string }> {
    // 1. Value Objects 생성
    const username = BoundedString.create(dto.username, {
      fieldName: 'username',
      minLength: 1,
      maxLength: 50,
    });

    // 2. 도메인 엔티티 생성 (static factory method)
    const user = User.create({
      username,
      realname: dto.realname
        ? BoundedString.create(dto.realname, {
            fieldName: 'realname',
            minLength: 1,
            maxLength: 50,
          })
        : undefined,
      // ...
    });

    // 3. 저장
    await this.userRepository.save(user);

    // 4. 결과 반환
    return { userId: user.id.toString() };
  }
}
```

### 핵심 규칙

- `Entity.create()` 정적 메서드 사용 (`new Entity()` 직접 호출 금지)
- Value Objects는 UseCase에서 생성 (원시값 → VO)
- 반환값은 `{ entityId: string }` 형태
- **응답 조립은 컨트롤러 책임**: command UseCase는 `void`/`{id}`만 반환하고, **컨트롤러가 find-detail UseCase로 재조회해 디테일을 응답**한다(수정/상태변경도 동일 — rules/conventions). 단 **조회 권한이 없는 생성**(예: 비회원 접수)은 디테일 재조회 대신 `{ id, createdAt }` 같은 최소 응답을 UseCase가 돌려준다.

## 패턴 2: Command UseCase (수정)

기존 엔티티를 조회한 후 도메인 메서드를 호출합니다.

```typescript
import { Injectable } from '@nestjs/common';
import { UpdateStudentDto } from '../dtos';
import { BoundedString } from '@lib/domain';
import { UserRepository } from '../../domain/repositories';
import { EntityNotFoundException } from '@shared/exception';

@Injectable()
export class UpdateStudentUseCase {
  constructor(private readonly userRepository: UserRepository) {}

  async execute(dto: UpdateStudentDto): Promise<void> {
    // 1. 엔티티 조회
    const user = await this.userRepository.findById(dto.userId);

    if (!user) {
      throw new EntityNotFoundException({
        entityName: 'User',
        errorCode: 'USER_NOT_FOUND',
        id: dto.userId,
      });
    }

    // 2. 도메인 메서드 호출 (직접 props 수정 금지)
    user.updateProfile(
      BoundedString.create(dto.realname, {
        fieldName: 'realname',
        minLength: 1,
        maxLength: 50,
      }),
      dto.rank
        ? BoundedString.create(dto.rank, {
            fieldName: 'rank',
            minLength: 1,
            maxLength: 50,
          })
        : undefined,
      dto.phone
        ? BoundedString.create(dto.phone, {
            fieldName: 'phone',
            minLength: 1,
            maxLength: 20,
          })
        : undefined,
    );

    // 3. 저장
    await this.userRepository.save(user);
  }
}
```

### 핵심 규칙

- `EntityNotFoundException`으로 존재 여부 확인
- 도메인 메서드를 통한 수정 (직접 props 수정 금지)
- 반환값 없음 (`void`)

## 패턴 3: Command UseCase (상태 변경)

단순 상태 변경에 사용합니다.

```typescript
import { Injectable } from '@nestjs/common';
import { ActivateStudentDto } from '../dtos';
import { UserRepository } from '../../domain/repositories';
import { EntityNotFoundException } from '@shared/exception';

@Injectable()
export class ActivateStudentUseCase {
  constructor(private readonly userRepository: UserRepository) {}

  async execute(dto: ActivateStudentDto): Promise<void> {
    const user = await this.userRepository.findById(dto.userId);

    if (!user) {
      throw new EntityNotFoundException({
        entityName: 'User',
        errorCode: 'USER_NOT_FOUND',
        id: dto.userId,
      });
    }

    user.activate();

    await this.userRepository.save(user);
  }
}
```

## 패턴 4: Command UseCase (결과 DTO 반환)

복잡한 처리 결과를 별도 Output DTO로 반환합니다.

```typescript
import { Injectable } from '@nestjs/common';
import { RecordHeartbeatDto, HeartbeatResultDto } from '../dtos';
import { PositiveNumber } from '@lib/domain/value-objects';
import { LectureProgress } from '../../domain/models';
import { LectureProgressRepository } from '../../domain/repositories';
import { LectureLookupService } from '../../domain/services';
import { EntityNotFoundException } from '@shared/exception';
import { retry } from '@shared/utils';

@Injectable()
export class RecordHeartbeatUseCase {
  constructor(
    private readonly lectureProgressRepository: LectureProgressRepository,
    private readonly lectureLookupService: LectureLookupService,
  ) {}

  async execute(dto: RecordHeartbeatDto): Promise<HeartbeatResultDto> {
    const currentPosition = PositiveNumber.create(dto.currentPosition, {
      fieldName: 'currentPosition',
    }).value;

    // 1. 외부 컨텍스트 조회 (LookupService)
    const lectureInfo = await this.lectureLookupService.findForHeartbeat(
      dto.lectureId,
    );
    if (!lectureInfo) {
      throw new EntityNotFoundException({
        entityName: 'Lecture',
        id: dto.lectureId,
        errorCode: 'LECTURE_NOT_FOUND',
      });
    }

    // 2. 동시성 충돌 시 재시도
    return retry(
      async () => {
        let progress =
          await this.lectureProgressRepository.findByUserAndLecture(
            dto.userId,
            dto.lectureId,
          );

        if (!progress) {
          progress = LectureProgress.create(dto.userId, dto.lectureId);
        }

        // 3. 도메인 메서드 호출
        const justCompleted = progress.applyHeartbeat(
          currentPosition,
          dto.watchedSeconds,
          lectureInfo.durationSeconds,
          lectureInfo.completionThreshold,
          lectureInfo.courseId,
        );

        // 4. 저장
        await this.lectureProgressRepository.save(progress);

        // 5. 결과 DTO 반환
        return {
          watchRate: progress.watchRate,
          totalWatchedSeconds: progress.totalWatchedSeconds,
          isCompleted: progress.isCompleted,
          justCompleted,
        };
      },
      { maxAttempts: 3 },
    );
  }
}
```

### 핵심 규칙

- Output DTO는 `application/dtos/`에 정의
- LookupService로 다른 컨텍스트 데이터 조회
- `retry()` 유틸로 동시성 충돌 재시도
- `Entity.create()` 정적 메서드로 새 엔티티 생성

## 패턴 5: Query UseCase (목록 조회 + 페이지네이션)

Query Service를 호출하여 **페이지네이션 메타 정보를 포함한 래핑 객체**를 반환합니다.

```typescript
import { Injectable } from '@nestjs/common';
import { FindProductListDto, ProductListResult } from '../dtos';
import { ProductQueryService } from '../../domain/services';

@Injectable()
export class FindProductListUseCase {
  constructor(private readonly productQueryService: ProductQueryService) {}

  async execute(dto: FindProductListDto): Promise<ProductListResult> {
    // page → skip 변환 (UseCase 책임)
    const page = dto.page ?? 1;
    const skip = (page - 1) * dto.limit;

    // findList + countList 병렬 조회
    const [items, totalCount] = await Promise.all([
      this.productQueryService.findList({
        skip,
        limit: dto.limit,
        keyword: dto.keyword,
        categoryId: dto.categoryId,
      }),
      this.productQueryService.countList({
        keyword: dto.keyword,
        categoryId: dto.categoryId,
      }),
    ]);

    const totalPages = Math.ceil(totalCount / dto.limit) || 1;

    return {
      items,
      totalCount,
      totalPages,
      currentPage: page,
    };
  }
}
```

### 핵심 규칙

- Query Service 사용 (Repository 사용 금지)
- `Promise.all()`로 findList + countList 병렬 조회
- 결과는 `{ items, totalCount, totalPages, currentPage }` 래핑 객체
- ReadModel 반환 (도메인 엔티티 반환 금지)

> ⚠️ 위는 **오프셋** 방식. 프로젝트가 **커서** 방식이면 아래 패턴 5-B를 쓴다(방식은 조사).

## 패턴 5-B: Query UseCase (커서 기반 목록)

커서 프로젝트에서: 커서 디코딩 → `limit + 1` 조회 → `paginate`로 `{ items, nextCursor, hasNext }` 산출. (공용 유틸 이름은 조사 — 예: `CursorUtil`)

```typescript
async execute(dto: FindXxxListDto): Promise<{
  items: XxxListItemReadModel[];
  nextCursor?: string;
  hasNext: boolean;
}> {
  const rows = await this.xxxQueryService.findList({
    cursor: CursorUtil.decode(dto.cursor),
    limit: dto.limit + 1, // 다음 페이지 존재 판단용 +1
    status: dto.status,
  });
  return CursorUtil.paginate(rows, dto.limit, (item) => ({
    id: item.id,
    createdAt: item.createdAt,
  }));
}
```

## 패턴 6: Query UseCase (상세 조회 + 예외)

```typescript
import { Injectable } from '@nestjs/common';
import { FindUserDto } from '../dtos';
import { UserQueryService } from '../../domain/services';
import { UserReadModel } from '../../domain/models';
import { EntityNotFoundException } from '@shared/exception';

@Injectable()
export class FindUserUseCase {
  constructor(private readonly userQueryService: UserQueryService) {}

  async execute(dto: FindUserDto): Promise<UserReadModel> {
    const user = await this.userQueryService.findById(dto.userId);

    if (!user) {
      throw new EntityNotFoundException({
        entityName: 'User',
        errorCode: 'USER_NOT_FOUND',
        id: dto.userId,
      });
    }

    return user;
  }
}
```

## 패턴 7: Event-Handler 전용 UseCase (크로스 모듈)

다른 모듈의 Domain Event를 처리하는 UseCase입니다. Event Handler가 직접 호출합니다.

```typescript
import { Injectable, Logger } from '@nestjs/common';
import { CourseCompletionRepository } from '../../domain/repositories';
import { CourseCompletion } from '../../domain/models';
import { CourseCompletionCheckService } from '../../domain/services';

@Injectable()
export class HandleLectureCompletedUseCase {
  constructor(
    private readonly courseCompletionRepository: CourseCompletionRepository,
    private readonly courseCompletionCheckService: CourseCompletionCheckService,
  ) {}

  async execute(userId: string, courseId: string): Promise<void> {
    // 1. Domain Service로 수료 조건 확인
    const shouldComplete =
      await this.courseCompletionCheckService.shouldMarkCompleted(
        userId,
        courseId,
      );

    if (!shouldComplete) {
      return;
    }

    // 2. 이미 수료 처리됐는지 확인
    const existing = await this.courseCompletionRepository.findByUserAndCourse(
      userId,
      courseId,
    );
    if (existing) {
      return;
    }

    // 3. 수료 기록 생성
    const completion = CourseCompletion.create(userId, courseId);
    await this.courseCompletionRepository.save(completion);
  }
}
```

### 핵심 규칙

- DTO 없이 직접 파라미터 (`userId: string, courseId: string`)
- Event Handler에서 호출되므로 예외는 Handler가 catch
- 멱등성 보장 (이미 존재하면 무시)

## 패턴 8: Delete UseCase

```typescript
import { Injectable } from '@nestjs/common';
import { CategoryRepository } from '../../domain/repositories';
import { EntityNotFoundException } from '@shared/exception';

@Injectable()
export class DeleteCategoryUseCase {
  constructor(private readonly categoryRepository: CategoryRepository) {}

  async execute(dto: { categoryId: string }): Promise<void> {
    const category = await this.categoryRepository.findById(dto.categoryId);

    if (!category) {
      throw new EntityNotFoundException({
        entityName: 'Category',
        errorCode: 'CATEGORY_NOT_FOUND',
        id: dto.categoryId,
      });
    }

    await this.categoryRepository.delete(category.id.toString());
  }
}
```

## UseCase 유형 선택 가이드

| 유형          | 의존성                      | 반환 타입                    | 예시                                         |
| ------------- | --------------------------- | ---------------------------- | -------------------------------------------- |
| 생성          | Repository                  | `{ entityId: string }`       | SignUpUserUseCase                            |
| 수정/상태변경 | Repository                  | `void`                       | UpdateStudentUseCase, ActivateStudentUseCase |
| 삭제          | Repository                  | `void`                       | DeleteCategoryUseCase                        |
| 결과 DTO 반환 | Repository + Domain Service | Output DTO                   | RecordHeartbeatUseCase                       |
| 목록 조회     | Query Service               | `{ items, totalCount, ... }` | FindProductListUseCase                       |
| 상세 조회     | Query Service               | `ReadModel`                  | FindUserUseCase                              |
| 이벤트 처리   | Repository + Domain Service | `void`                       | HandleLectureCompletedUseCase                |

## 중요 규칙

- `@Injectable()` 데코레이터 필수
- `async execute()` 메서드 (항상 async)
- `Entity.create()` 정적 메서드로 생성 (`new Entity()` 금지)
- Value Objects는 UseCase에서 생성 (`BoundedString.create()`)
- 도메인 메서드를 통한 수정 (직접 props 수정 금지)
- 조회는 Query Service + ReadModel (Repository로 Entity 조회 후 변환 금지)

## 주의사항

- UseCase에 비즈니스 로직 직접 작성 금지 (도메인 레이어에 작성)
- Application DTO에 Value Objects 사용 금지
- 조회 UseCase에서 도메인 엔티티 반환 금지
- Presentation Layer 의존성 금지 (Controller, Request DTO 등)
