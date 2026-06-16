# Application DTO 작성 패턴

Application DTO는 UseCase의 입력/출력 파라미터를 정의합니다. **`interface`로 정의**하며, primitive types만 사용합니다.

## 위치: UseCase 파일에 인라인 (전사 표준)

입력 DTO가 그 UseCase **1곳에서만** 쓰이면(1:1·private) **별도 `application/dtos/` 파일을 만들지 말고 UseCase 파일 상단에 `export interface`로 인라인**한다. (콜로케이션 = 컨텍스트가 곧 문서, 자기완결 파일)

```typescript
// create-product.usecase.ts  ← DTO를 같은 파일에 둔다

export interface CreateProductDto {
  name: string;
  price: number;
  categoryId: string;
}

@Injectable()
export class CreateProductUseCase {
  /* ... */
}
```

- **2개+ UseCase가 공유**하는 DTO만 별도 파일로 — 단 그건 결합 신호(공용 최소 위치 또는 도메인으로 내릴지 검토).
- 아래 패턴들의 **필드·nullable·네이밍 규칙은 그대로 유효**하다 — _위치만_ UseCase 파일 내부로 바뀐 것(`application/dtos/` 폴더는 만들지 않는다).

## 왜 interface인가?

| 구분          | Application DTO                         | Presentation Request DTO      |
| ------------- | --------------------------------------- | ----------------------------- |
| **정의**      | **`interface`**                         | **`class`**                   |
| 위치          | **UseCase 파일에 인라인** (1:1·private) | `presentation/dtos/request/`  |
| 목적          | UseCase 입력 (컴파일 타임 타입 안전성)  | Controller 입력 (런타임 검증) |
| Validation    | 없음 (Presentation에서 이미 검증됨)     | `@IsNotEmpty()` 등            |
| Documentation | 없음                                    | `@ApiProperty()`              |
| 의존성        | 없음 (프레임워크 독립)                  | `class-validator`, `swagger`  |

Application Layer는 **이미 Presentation에서 검증된 데이터**를 받으므로 런타임 검증이 불필요합니다. `interface`가 더 가볍고 프레임워크에 독립적입니다.

## 패턴 1: Create Input DTO

```typescript
// create-product.usecase.ts (DTO 인라인)

/** 상품 생성 입력 */
export interface CreateProductDto {
  name: string;
  description?: string;
  price: number;
  categoryId: string;
}
```

## 패턴 2: Update Input DTO

Update DTO에서는 **세 가지 상태를 구분**해야 합니다:

| 필드 상태            | 타입                     | 의미                     |
| -------------------- | ------------------------ | ------------------------ |
| `undefined` (미지정) | `field?: string`         | 이 필드를 수정하지 않음  |
| `null` (제거)        | `field?: string \| null` | 이 필드의 값을 제거함    |
| 값 있음              | `field?: string`         | 이 필드를 새 값으로 수정 |

```typescript
// update-product.usecase.ts (DTO 인라인)

/** 상품 수정 입력 */
export interface UpdateProductDto {
  /** 수정 대상 ID */
  id: string;

  /** 상품명 (미지정 시 수정 안 함) */
  name?: string;

  /** 설명 (null이면 제거, undefined면 수정 안 함) */
  description?: string | null;

  /** 가격 (미지정 시 수정 안 함) */
  price?: number;

  /** 카테고리 ID (null이면 카테고리 해제, undefined면 수정 안 함) */
  categoryId?: string | null;

  /** 활성 여부 (미지정 시 수정 안 함) */
  isActive?: boolean;
}
```

### UseCase에서의 nullable 필드 처리

```typescript
// UseCase 내부에서 세 가지 상태 구분
async execute(dto: UpdateProductDto): Promise<void> {
  const product = await this.productRepository.findById(dto.id);
  if (!product) { throw new EntityNotFoundException({ ... }); }

  // undefined(미지정) vs null(제거) vs 값 있음 세 가지를 모두 구분
  const name = dto.name !== undefined
    ? BoundedString.create(dto.name, { fieldName: 'name', maxLength: 255 })
    : undefined;

  const description = dto.description !== undefined
    ? dto.description !== null
      ? BoundedString.create(dto.description, { fieldName: 'description', maxLength: 65535 })
      : null    // null → 값 제거
    : undefined; // undefined → 수정 안 함

  product.update({ name, description, ... });
  await this.productRepository.save(product);
}
```

## 패턴 3: Find List DTO (페이지네이션 포함)

```typescript
// find-product-list.usecase.ts (DTO 인라인)

/** 상품 목록 조회 입력 */
export interface FindProductListDto {
  page: number;
  limit: number;
  keyword?: string;
  categoryId?: string;
}
```

### FindList UseCase 결과: 인라인 래핑 객체

목록 조회 UseCase는 ReadModel[]을 직접 반환하지 않고, **페이지네이션 메타를 포함한 래핑 객체를 인라인**으로 반환합니다 (named 타입은 만들지 않음 — 프로젝트 관례 있으면 우선):

```typescript
// 반환 타입(인라인) 예시
// 오프셋: Promise<{ items: ProductListReadModel[]; totalCount: number; totalPages: number; currentPage: number }>
// 커서:   Promise<{ items: ProductListReadModel[]; nextCursor?: string; hasNext: boolean }>
```

```typescript
// UseCase에서의 사용
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

## 패턴 4: 결과 반환 (인라인 익명)

UseCase가 복잡한 결과를 반환할 때는 **named 타입을 만들지 말고 인라인 익명 객체**로 반환합니다 (`...Result`는 fp `Either`/`Result` 모나드와 혼동되어 회피). 단순 상세 조회는 ReadModel을 직접 반환합니다.

```typescript
// login.usecase.ts

async execute(dto: LoginDto): Promise<{ accessToken: string; refreshToken: string }> {
  // ...
}
```

> conventions §0대로 **프로젝트에 기존 결과 네이밍 관례가 있으면 그것을 우선**(조사 후 따름).

### 결과(인라인) vs ReadModel

- **쿼리(조회) 결과 = ReadModel 그대로** — 상세는 `Promise<XxxReadModel>` 직접, 목록은 `Promise<{ items: XxxReadModel[]; nextCursor?; hasNext }>` 인라인. transformer가 이 **ReadModel을 직접** 받아 ResponseDto로 변환한다 (별도 output 타입 없음).
- **커맨드 결과 = `{ id }`/`{ jobId }` 등 인라인** (서버 생성 식별자·메타).

| 구분      | 결과 (인라인 `{ }`)        | ReadModel        |
| --------- | -------------------------- | ---------------- |
| 위치      | UseCase 반환 타입에 인라인 | `domain/models/` |
| 용도      | UseCase 처리 결과(커맨드)  | 조회 전용 데이터 |
| 생성 주체 | UseCase                    | Query Service    |

## 패턴 5: Custom Action DTO

```typescript
// change-password.usecase.ts (DTO 인라인)

/** 비밀번호 변경 입력 */
export interface ChangePasswordDto {
  userId: string;
  currentPassword: string;
  newPassword: string;
}
```

## 네이밍 규칙

| 유형        | 패턴                  | 예시                                     |
| ----------- | --------------------- | ---------------------------------------- |
| 생성        | `Create{Entity}Dto`   | `CreateProductDto`                       |
| 수정        | `Update{Entity}Dto`   | `UpdateProductDto`                       |
| 목록 조회   | `Find{Entity}ListDto` | `FindProductListDto`                     |
| 커스텀 액션 | `{Action}{Entity}Dto` | `ChangePasswordDto`, `ApproveArticleDto` |

> **결과(출력)는 named 타입을 만들지 않으므로 네이밍 규칙 없음** → 인라인 `{ }`(패턴 4). 입력 DTO만 위 규칙을 따른다.

## 중요 규칙

- **`export interface`로 정의** (`class` 아님, 데코레이터 없음)
- primitive types만 사용 (`string`, `number`, `boolean`, `Date`)
- Value Objects 사용 금지
- Validation 데코레이터 사용 금지 (Presentation Layer에서 처리)
- Update DTO에서 nullable 필드는 `field?: type | null` 로 명시
- **결과(출력)는 named 타입(`...Result`) 없이 인라인 `{ ... }`** (패턴 4) — 단 프로젝트 관례 있으면 우선
- FindList 결과는 인라인 `{ items, totalCount, totalPages, currentPage }`(오프셋) / `{ items, nextCursor, hasNext }`(커서) 래핑 객체

## 주의사항

- ❌ Application DTO에 Value Objects 사용 금지
- ❌ Validation 데코레이터 사용 금지
- ❌ `class` 사용 금지 (런타임 기능 불필요)
- ❌ FindList에서 ReadModel[] 직접 반환 금지 (래핑 객체 사용)
- ✅ `interface`로 정의 (컴파일 타임 타입 안전성)
- ✅ primitive types만 사용
- ✅ Update DTO에서 `undefined`(미지정)와 `null`(제거) 명확히 구분
