# UseCase 작성 패턴

UseCase는 비즈니스 유즈케이스를 실행하는 애플리케이션 서비스입니다. 도메인 메서드를 오케스트레이션하고, **ReadModel(쿼리)** 또는 **리소스 원시투영/인라인 결과(커맨드)** 를 반환합니다.

> **입력 DTO 인라인 (전사 표준)**: 입력 DTO가 그 UseCase **1곳에서만** 쓰이면 별도 `../dtos` 파일이 아니라 **UseCase 파일 상단에 `export interface`로 인라인**한다 (`conventions.md` §4). 공유 DTO(2개+ UseCase)만 별도 파일 — 단 그건 결합 신호.
> **결과(출력) 타입**:
>
> - **쿼리 = ReadModel 그대로** (상세 `Promise<XxxReadModel>` 직접 / 목록 `Promise<{ items: XxxReadModel[]; nextCursor?; hasNext }>` 인라인 — transformer가 ReadModel을 직접 받음).
> - **커맨드 = ① 리소스 반환이면 `aggregate.toPrimitives()`의 `XxxPrimitives`** (애그리거트가 `HasPrimitives<P>` 옵트인, **도메인 소유** named 타입 — `api-response.md §8`·`domain.md`) **② 리소스 아닌 커스텀 계산 결과면 인라인 `{ ... }`** **③ 순수 액션(삭제·이벤트 등)이면 `void`**.
> - `...Result` 네이밍은 fp `Either/Result` 모나드와 혼동되어 **회피** (그래서 리소스는 `Primitives`, 커스텀은 인라인). conventions §0대로 **기존 결과 관례가 있으면 우선**.
>   **CQRS**: 커맨드(생성/수정/삭제/상태변경)는 **QueryService에 의존하지 않는다** — 자기 컨텍스트의 존재/스코프 확인은 **Repository finder**(`existsBy...`/`findByIdAndOwner`), 크로스 BC는 **LookupService**. (QueryService는 조회 UseCase 전용)

## 패턴 1: Command UseCase (생성)

Entity의 `create()` 정적 메서드를 호출하여 생성합니다.

```typescript
import { Injectable } from '@nestjs/common';
import { BoundedString } from '@lib/domain';
// User는 HasPrimitives<UserPrimitives>를 옵트인 구현 (UserPrimitives는 도메인 소유)
import { User, UserPrimitives } from '../../domain/models';
import { UserRepository } from '../../domain/repositories';

// 입력 DTO는 이 UseCase 파일에 인라인 (전사 표준 — conventions §4)
export interface SignUpUserDto {
  username: string;
  realname?: string;
}

@Injectable()
export class SignUpUserUseCase {
  constructor(private readonly userRepository: UserRepository) {}

  async execute(dto: SignUpUserDto): Promise<UserPrimitives> {
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

    // 4. 결과 반환 — 재조회 없이 애그리거트 원시 투영 (민감필드 제외)
    return user.toPrimitives();
  }
}
```

### 핵심 규칙

- `Entity.create()` 정적 메서드 사용 (`new Entity()` 직접 호출 금지)
- Value Objects는 UseCase에서 생성 (원시값 → VO)
- **반환값 = 리소스 원시 표현 (`aggregate.toPrimitives()`)**: command UseCase는 저장 후 **재조회 없이 애그리거트에서 직접** `XxxPrimitives`를 반환한다(`api-response.md §8`). 애그리거트는 `HasPrimitives<P>`(`@lib/domain`)를 **옵트인** 구현(민감필드 제외). 컨트롤러는 쿼리 ReadModel과 분리된 `fromPrimitives`로 응답 DTO에 매핑.
  - ❌ `void`/`{id}`만 반환 후 컨트롤러가 find-detail로 **재조회하지 않는다** (DB 풀 오버헤드·CQRS상 커맨드가 쿼리측 비의존).
  - 순수 액션(로그아웃·논리삭제 등 클라가 표시 안 함)만 `void`/204.

## 패턴 2: Command UseCase (수정)

기존 엔티티를 조회한 후 도메인 메서드를 호출합니다.

```typescript
import { Injectable } from '@nestjs/common';
import { BoundedString } from '@lib/domain';
import { UserPrimitives } from '../../domain/models';
import { UserRepository } from '../../domain/repositories';
import { EntityNotFoundException } from '@shared/exception';

// 입력 DTO는 이 UseCase 파일에 인라인 (전사 표준 — conventions §4)
export interface UpdateStudentDto {
  userId: string;
  realname: string;
  rank?: string;
  phone?: string;
}

@Injectable()
export class UpdateStudentUseCase {
  constructor(private readonly userRepository: UserRepository) {}

  async execute(dto: UpdateStudentDto): Promise<UserPrimitives> {
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

    // 4. 수정 결과 반환 — 재조회 없이 애그리거트 원시 투영
    return user.toPrimitives();
  }
}
```

### 핵심 규칙

- `EntityNotFoundException`으로 존재 여부 확인
- 도메인 메서드를 통한 수정 (직접 props 수정 금지)
- **수정된 리소스 원시 표현 반환**(`user.toPrimitives()` — 재조회 X). 클라가 표시하지 않는 순수 액션이면 `void`/204.

## 패턴 3: Command UseCase (상태 변경)

단순 상태 변경에 사용합니다.

```typescript
import { Injectable } from '@nestjs/common';
import { UserPrimitives } from '../../domain/models';
import { UserRepository } from '../../domain/repositories';
import { EntityNotFoundException } from '@shared/exception';

// 입력 DTO는 이 UseCase 파일에 인라인 (전사 표준 — conventions §4)
export interface ActivateStudentDto {
  userId: string;
}

@Injectable()
export class ActivateStudentUseCase {
  constructor(private readonly userRepository: UserRepository) {}

  async execute(dto: ActivateStudentDto): Promise<UserPrimitives> {
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

    // 상태 변경 결과 반환 — 재조회 없이 애그리거트 원시 투영
    return user.toPrimitives();
  }
}
```

## 패턴 3-B: Command UseCase (다중 애그리거트 — UnitOfWork)

같은 BC의 **애그리거트 2개 이상을 한 트랜잭션으로 함께 수정**해야 할 때 `IUnitOfWork`를 쓴다. **즉시 일관성이 그 유스케이스의 책임일 때만** (아니면 패턴 7처럼 이벤트로 결과적 일관성 — `rules/domain.md` 트랜잭션 경계 참조).

```typescript
import { Injectable } from '@nestjs/common';
import type { IUnitOfWork } from '@lib/domain';
import { InjectUnitOfWork } from '@core/database';
import { EntityNotFoundException } from '@shared/exception';
import { OrderRepository, BuyerRepository } from '../../domain/repositories';

// 입력 DTO는 이 UseCase 파일에 인라인 (전사 표준 — conventions §4)
export interface PlaceOrderDto {
  orderId: string;
  buyerId: string;
}

@Injectable()
export class PlaceOrderUseCase {
  constructor(
    @InjectUnitOfWork() private readonly uow: IUnitOfWork,
    private readonly orderRepository: OrderRepository,
    private readonly buyerRepository: BuyerRepository,
  ) {}

  async execute(dto: PlaceOrderDto): Promise<void> {
    // 1. 조회·검증은 트랜잭션 "밖"에서 (fail-fast → 불필요한 트랜잭션 점유 회피)
    const order = await this.orderRepository.findById(dto.orderId);
    if (!order) {
      throw new EntityNotFoundException({
        entityName: 'Order',
        id: dto.orderId,
      });
    }
    const buyer = await this.buyerRepository.findById(dto.buyerId);
    if (!buyer) {
      throw new EntityNotFoundException({
        entityName: 'Buyer',
        id: dto.buyerId,
      });
    }

    // 2. 도메인 행위 (불변식은 각 애그리거트가 강제)
    order.place();
    buyer.recordPurchase(order.totalAmount);

    // 3. 두 save 를 한 트랜잭션으로 — 둘 다 커밋되거나 둘 다 롤백
    //    repo 는 트랜잭션을 모른다. PrismaService(Proxy)가 ambient(ALS)로 자동 전파.
    await this.uow.execute(async () => {
      await this.orderRepository.save(order);
      await this.buyerRepository.save(buyer);
    });
  }
}
```

### 핵심 규칙

- **주입**: `@InjectUnitOfWork() uow: IUnitOfWork` + 각 Repository. (`@core/database`·`@lib/domain`)
- **조회·검증은 `execute` 밖**: fail-fast로 트랜잭션 점유 시간 최소화. 트랜잭션 안엔 **쓰기(save)만**.
- **repo 코드는 평소 그대로** (`this.prisma.x`): `uow.execute` 안에선 자동으로 tx로 실행, 밖에선 일반 커넥션. `this.client` 게터 같은 보일러플레이트 불필요 (`docs/architecture/unit-of-work.md`).
- **남용 금지**: 단일 애그리거트면 UoW 불필요. 즉시 일관성이 필요 없으면 도메인 이벤트(결과적 일관성)가 기본. (선택 기준 = `rules/domain.md`)

## 패턴 4: Command UseCase (결과 반환)

복잡한 처리 결과를 **인라인 익명 객체**(`Promise<{ ... }>`)로 반환합니다. (별도 named 출력 타입은 만들지 않음 — 프로젝트 관례 있으면 우선)

```typescript
import { Injectable } from '@nestjs/common';
import { PositiveNumber } from '@lib/domain/value-objects';
import { LectureProgress } from '../../domain/models';
import { LectureProgressRepository } from '../../domain/repositories';
import { LectureLookupService } from '../../domain/services';
import { EntityNotFoundException } from '@shared/exception';
import { retry } from '@shared/utils';

// 입력 DTO는 이 UseCase 파일에 인라인 (전사 표준 — conventions §4)
export interface RecordHeartbeatDto {
  userId: string;
  lectureId: string;
  currentPosition: number;
  watchedSeconds: number;
}

@Injectable()
export class RecordHeartbeatUseCase {
  constructor(
    private readonly lectureProgressRepository: LectureProgressRepository,
    private readonly lectureLookupService: LectureLookupService,
  ) {}

  async execute(dto: RecordHeartbeatDto): Promise<{
    watchRate: number;
    totalWatchedSeconds: number;
    isCompleted: boolean;
    justCompleted: boolean;
  }> {
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

        // 5. 인라인 결과 반환
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

- 결과는 **인라인 익명 객체**(`Promise<{ ... }>`)로 반환 — named 출력 타입(`...Result`) 안 만듦 (프로젝트 관례 있으면 우선)
- LookupService로 다른 컨텍스트 데이터 조회
- `retry()` 유틸로 동시성 충돌 재시도
- `Entity.create()` 정적 메서드로 새 엔티티 생성

## 패턴 5: Query UseCase (목록 조회 + 페이지네이션)

Query Service를 호출하여 **페이지네이션 메타 정보를 포함한 래핑 객체**를 반환합니다.

```typescript
import { Injectable } from '@nestjs/common';
import { ProductQueryService } from '../../domain/services';
import { ProductListReadModel } from '../../domain/models';

// 입력 DTO는 이 UseCase 파일에 인라인 (전사 표준 — conventions §4)
export interface FindProductListDto {
  page: number;
  limit: number;
  keyword?: string;
  categoryId?: string;
}

@Injectable()
export class FindProductListUseCase {
  constructor(private readonly productQueryService: ProductQueryService) {}

  async execute(dto: FindProductListDto): Promise<{
    items: ProductListReadModel[];
    totalCount: number;
    totalPages: number;
    currentPage: number;
  }> {
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
import { UserQueryService } from '../../domain/services';
import { UserReadModel } from '../../domain/models';
import { EntityNotFoundException } from '@shared/exception';

// 입력 DTO는 이 UseCase 파일에 인라인 (전사 표준 — conventions §4)
export interface FindUserDto {
  userId: string;
}

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

// 입력 DTO는 이 UseCase 파일에 인라인 (전사 표준 — conventions §4)
export interface DeleteCategoryDto {
  categoryId: string;
}

@Injectable()
export class DeleteCategoryUseCase {
  constructor(private readonly categoryRepository: CategoryRepository) {}

  async execute(dto: DeleteCategoryDto): Promise<void> {
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

| 유형                           | 의존성                           | 반환 타입                              | 예시                                         |
| ------------------------------ | -------------------------------- | -------------------------------------- | -------------------------------------------- |
| 생성                           | Repository                       | **`XxxPrimitives`** (`toPrimitives()`) | SignUpUserUseCase                            |
| 수정/상태변경                  | Repository                       | **`XxxPrimitives`** (`toPrimitives()`) | UpdateStudentUseCase, ActivateStudentUseCase |
| 다중 애그리거트(동일 트랜잭션) | **UnitOfWork** + Repository 다수 | 보통 `void`/리소스                     | PlaceOrderUseCase (패턴 3-B)                 |
| 삭제                           | Repository                       | `void` (순수 액션 → 204)               | DeleteCategoryUseCase                        |
| 결과 반환(비리소스)            | Repository + Domain Service      | 인라인 `{ ... }`                       | RecordHeartbeatUseCase                       |
| 목록 조회                      | Query Service                    | `{ items, totalCount, ... }`           | FindProductListUseCase                       |
| 상세 조회                      | Query Service                    | `ReadModel`                            | FindUserUseCase                              |
| 이벤트 처리                    | Repository + Domain Service      | `void`                                 | HandleLectureCompletedUseCase                |

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
