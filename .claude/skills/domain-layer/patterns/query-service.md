# Query Service Interface 작성 패턴

Query Service는 복잡한 조회 쿼리 전용 인터페이스입니다. 일반 Repository는 `save()`, `findById()` 등을 담당하고, Query Service는 목록 조회, 상세 조회, 집계 등 복잡한 읽기 작업을 담당합니다.

## 페이지네이션 전략

요구사항에 따라 **오프셋 기반** 또는 **커서 기반** 페이지네이션을 선택합니다:

| 전략                    | 사용 시점                                      | 장점                                     | 단점                                  |
| ----------------------- | ---------------------------------------------- | ---------------------------------------- | ------------------------------------- |
| **오프셋 (skip/limit)** | 관리자 목록, 게시판 등 페이지 번호가 필요한 UI | 총 건수 제공 가능, 특정 페이지 바로 이동 | 대량 데이터에서 성능 저하             |
| **커서 (cursor/limit)** | 무한 스크롤, 피드, 타임라인                    | 대량 데이터에서 일관된 성능              | 총 건수 불필요, 특정 페이지 이동 불가 |

## 오프셋 기반: findList + countList 쌍

페이지 번호 기반 UI에서 사용합니다. **데이터 조회 + 건수 조회**를 쌍으로 정의합니다:

```typescript
import { ProductListReadModel, ProductDetailReadModel } from '../models';

/** 상품 목록 조회 파라미터 */
export interface FindProductListParams {
  /** 건너뛸 항목 수 (오프셋) */
  skip: number;
  /** 조회할 항목 수 */
  limit: number;
  /** 카테고리 ID 필터 */
  categoryId?: string;
  /** 활성 여부 필터 */
  isActive?: boolean;
  /** 검색 키워드 */
  keyword?: string;
}

/** 상품 건수 조회 파라미터 */
export interface CountProductListParams {
  categoryId?: string;
  isActive?: boolean;
  keyword?: string;
}

/** 상품 조회용 QueryService */
export abstract class ProductQueryService {
  /** 상품 목록을 조회합니다. */
  abstract findList(
    params: FindProductListParams,
  ): Promise<ProductListReadModel[]>;

  /** 상품 목록의 전체 건수를 조회합니다. */
  abstract countList(params: CountProductListParams): Promise<number>;

  /** 상품 상세를 조회합니다. */
  abstract findDetailById(
    id: string,
  ): Promise<ProductDetailReadModel | undefined>;
}
```

> **`skip` vs `page`**: QueryService 파라미터는 반드시 `skip`(DB 레벨 오프셋)을 사용합니다. `page → skip` 변환은 UseCase에서 `skip = (page - 1) * limit`으로 계산합니다.

> **CountParams**: `Omit` 타입이 아닌 별도 `interface`로 정의합니다.

## 커서 기반: findList만 (countList 불필요)

무한 스크롤/피드 UI에서 사용합니다. 다음 페이지 존재 여부는 `limit + 1`개를 조회하여 판단합니다:

```typescript
import { FeedItemReadModel } from '../models';

/** 피드 조회 조건 (커서 기반) */
export interface FindFeedListParams {
  userId: string;
  cursor?: string; // 마지막 항목의 ID (첫 페이지는 undefined)
  limit: number;
}

/** 피드 조회용 QueryService */
export abstract class FeedQueryService {
  /** 피드 목록을 조회합니다. */
  abstract findList(params: FindFeedListParams): Promise<FeedItemReadModel[]>;
}
```

> **참고**: 커서 기반에서는 `countList`가 불필요합니다. 총 건수 없이 "다음 페이지 있음/없음"만 판단하기 때문입니다.

## Params 인터페이스 네이밍 규칙

| 패턴                           | 용도                               | 예시                         |
| ------------------------------ | ---------------------------------- | ---------------------------- |
| `Find{Entity}ListParams`       | 목록 조회 조건 (페이지네이션 포함) | `FindProductListParams`      |
| `Count{Entity}ListParams`      | 건수 조회 조건 (페이지네이션 제외) | `CountProductListParams`     |
| `Find{Role}{Entity}ListParams` | 역할별 조회 조건                   | `FindAdminProductListParams` |

## 역할별 메서드를 가진 Query Service (단일 서비스 패턴)

공개/관리자 조회를 **하나의 QueryService**에서 제공합니다. 별도 클래스로 분리하지 않습니다:

```typescript
import { ArticleListReadModel, ArticleDetailReadModel } from '../models';

/** 공개 게시글 목록 조회 파라미터 */
export interface FindArticleListParams {
  skip: number;
  limit: number;
  categoryId?: string;
  keyword?: string;
}

/** 공개 게시글 건수 조회 파라미터 */
export interface CountArticleListParams {
  categoryId?: string;
  keyword?: string;
}

/** 관리자 게시글 목록 조회 파라미터 */
export interface FindAdminArticleListParams {
  skip: number;
  limit: number;
  categoryId?: string;
  keyword?: string;
  isActive?: boolean;
}

/** 관리자 게시글 건수 조회 파라미터 */
export interface CountAdminArticleListParams {
  categoryId?: string;
  keyword?: string;
  isActive?: boolean;
}

/** 게시글 조회용 QueryService */
export abstract class ArticleQueryService {
  /** 공개 목록 조회 */
  abstract findList(
    params: FindArticleListParams,
  ): Promise<ArticleListReadModel[]>;

  /** 공개 건수 조회 */
  abstract countList(params: CountArticleListParams): Promise<number>;

  /** 상세 조회 */
  abstract findDetailById(
    id: string,
  ): Promise<ArticleDetailReadModel | undefined>;

  /** 관리자 목록 조회 */
  abstract findAdminList(
    params: FindAdminArticleListParams,
  ): Promise<ArticleListReadModel[]>;

  /** 관리자 건수 조회 */
  abstract countAdminList(params: CountAdminArticleListParams): Promise<number>;
}
```

## LookupService 패턴: 크로스 BC 조회 (cross-BC 전용)

**다른 바운디드 컨텍스트**의 엔티티 존재 여부를 확인할 때만 쓰는 패턴입니다. Domain Service의 abstract class로 정의하고 Infrastructure에서 Prisma 직접 쿼리로 구현합니다:

> ⚠️ **같은 BC(같은 모듈) 안의 존재/스코프 확인은 LookupService가 아니라 Repository finder**(`existsBy...`/`findByIdAndOwner`)로 한다. LookupService를 intra-BC에 쓰면 패턴 오용.

```typescript
/**
 * 카테고리 존재 확인 서비스 (LookupService)
 *
 * 현재 컨텍스트에서 카테고리 컨텍스트의 엔티티
 * 존재 여부를 확인합니다.
 * Infrastructure에서 구현합니다.
 */
export abstract class CategoryLookupService {
  /** 해당 ID의 카테고리가 존재하는지 확인합니다. */
  abstract existsById(id: string): Promise<boolean>;
}
```

## 메서드 네이밍 규칙

| 메서드명 패턴            | 용도          | 예시                                                  |
| ------------------------ | ------------- | ----------------------------------------------------- |
| `findList(params)`       | 목록 조회     | `findList(params: FindProductListParams)`             |
| `countList(params)`      | 건수 조회     | `countList(params: CountProductListParams)`           |
| `findDetailById(id)`     | 상세 조회     | `findDetailById(id: string)`                          |
| `findAdminList(params)`  | 관리자용 목록 | `findAdminList(params: FindAdminProductListParams)`   |
| `countAdminList(params)` | 관리자용 건수 | `countAdminList(params: CountAdminProductListParams)` |

## 규칙

- **abstract class** 사용 (NestJS DI 토큰 역할)
- abstract 메서드만 정의
- **ReadModel 타입 반환** (도메인 엔티티 아님)
- **조회(GET) 전용 — 커맨드(쓰기 유스케이스)는 QueryService에 의존하지 않는다** (자기 컨텍스트 존재/스코프는 Repository finder — §LookupService·`domain.md` 참조). write 작업 없음.
- **단일 서비스**: 공개/관리자 메서드를 하나의 QueryService에 정의 (별도 클래스 분리 금지)
- **skip 사용**: QueryService 파라미터는 `skip` (page 금지, page→skip 변환은 UseCase 책임)
- **CountParams 별도 interface**: `Omit` 타입 사용 금지, 별도 interface로 정의
- **findList + countList 쌍**: 목록 조회에는 반드시 건수 조회를 함께 정의
- **한국어 JSDoc 주석**: 각 메서드에 설명 추가
- **파일 위치**: `domain/services/{entity-name}-query.service.ts`

## Repository vs Query Service

| 구분        | Repository             | Query Service                                   |
| ----------- | ---------------------- | ----------------------------------------------- |
| 용도        | 저장, 단일 조회, 삭제  | 복잡한 목록/상세 조회                           |
| 반환 타입   | 도메인 엔티티          | ReadModel                                       |
| 주요 메서드 | `save()`, `findById()` | `findList()`, `countList()`, `findDetailById()` |
| 위치        | `domain/repositories/` | `domain/services/`                              |
