# Application DTO 작성 패턴

Application DTO는 UseCase의 입력/출력 파라미터를 정의합니다. **`interface`로 정의**하며, primitive types만 사용합니다.

## 왜 interface인가?

| 구분          | Application DTO                        | Presentation Request DTO      |
| ------------- | -------------------------------------- | ----------------------------- |
| **정의**      | **`interface`**                        | **`class`**                   |
| 위치          | `application/dtos/`                    | `presentation/dtos/request/`  |
| 목적          | UseCase 입력 (컴파일 타임 타입 안전성) | Controller 입력 (런타임 검증) |
| Validation    | 없음 (Presentation에서 이미 검증됨)    | `@IsNotEmpty()` 등            |
| Documentation | 없음                                   | `@ApiProperty()`              |
| 의존성        | 없음 (프레임워크 독립)                 | `class-validator`, `swagger`  |

Application Layer는 **이미 Presentation에서 검증된 데이터**를 받으므로 런타임 검증이 불필요합니다. `interface`가 더 가볍고 프레임워크에 독립적입니다.

## 패턴 1: Create Input DTO

```typescript
// create-product.dto.ts

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
// update-product.dto.ts

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
// find-product-list.dto.ts

/** 상품 목록 조회 입력 */
export interface FindProductListDto {
  page: number;
  limit: number;
  keyword?: string;
  categoryId?: string;
}
```

### FindList UseCase 결과: 래핑 객체 반환

목록 조회 UseCase는 ReadModel[]을 직접 반환하지 않고, **페이지네이션 메타 정보를 포함한 래핑 객체**를 반환합니다:

```typescript
/** 상품 목록 조회 결과 */
export interface ProductListResult {
  items: ProductListReadModel[];
  totalCount: number;
  totalPages: number;
  currentPage: number;
}
```

```typescript
// UseCase에서의 사용
@Injectable()
export class FindProductListUseCase {
  constructor(private readonly productQueryService: ProductQueryService) {}

  async execute(dto: FindProductListDto): Promise<ProductListResult> {
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

## 패턴 4: Output DTO (결과 반환)

UseCase가 복잡한 결과를 반환할 때 사용합니다. 단순 상세 조회는 ReadModel을 직접 반환하므로 Output DTO가 필요 없습니다.

```typescript
// login-result.dto.ts

/** 로그인 결과 */
export interface LoginResult {
  accessToken: string;
  refreshToken: string;
}
```

### Output DTO vs ReadModel

| 구분      | Output DTO          | ReadModel        |
| --------- | ------------------- | ---------------- |
| 위치      | `application/dtos/` | `domain/models/` |
| 용도      | UseCase 처리 결과   | 조회 전용 데이터 |
| 생성 주체 | UseCase             | Query Service    |

## 패턴 5: Custom Action DTO

```typescript
// change-password.dto.ts

/** 비밀번호 변경 입력 */
export interface ChangePasswordDto {
  userId: string;
  currentPassword: string;
  newPassword: string;
}
```

## 네이밍 규칙

| 유형        | 패턴                                           | 예시                                     |
| ----------- | ---------------------------------------------- | ---------------------------------------- |
| 생성        | `Create{Entity}Dto`                            | `CreateProductDto`                       |
| 수정        | `Update{Entity}Dto`                            | `UpdateProductDto`                       |
| 목록 조회   | `Find{Entity}ListDto`                          | `FindProductListDto`                     |
| 목록 결과   | `{Entity}ListResult`                           | `ProductListResult`                      |
| 커스텀 액션 | `{Action}{Entity}Dto`                          | `ChangePasswordDto`, `ApproveArticleDto` |
| 결과 반환   | `{Action}Result` 또는 `{Entity}{Action}Result` | `LoginResult`                            |

## 중요 규칙

- **`export interface`로 정의** (`class` 아님, 데코레이터 없음)
- primitive types만 사용 (`string`, `number`, `boolean`, `Date`)
- Value Objects 사용 금지
- Validation 데코레이터 사용 금지 (Presentation Layer에서 처리)
- Update DTO에서 nullable 필드는 `field?: type | null` 로 명시
- FindList 결과는 `{ items, totalCount, totalPages, currentPage }` 래핑 객체

## 주의사항

- ❌ Application DTO에 Value Objects 사용 금지
- ❌ Validation 데코레이터 사용 금지
- ❌ `class` 사용 금지 (런타임 기능 불필요)
- ❌ FindList에서 ReadModel[] 직접 반환 금지 (래핑 객체 사용)
- ✅ `interface`로 정의 (컴파일 타임 타입 안전성)
- ✅ primitive types만 사용
- ✅ Update DTO에서 `undefined`(미지정)와 `null`(제거) 명확히 구분
