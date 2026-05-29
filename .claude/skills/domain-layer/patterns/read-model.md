# Read Model 작성 패턴

Read Model은 복잡한 조회 결과를 표현하기 위한 모델입니다. 도메인 엔티티와 달리 primitive types만 사용합니다.

## 명명 규칙

| 패턴                         | 용도             | 예시                        |
| ---------------------------- | ---------------- | --------------------------- |
| `{Entity}ListReadModel`      | 목록 조회        | `ProductListReadModel`      |
| `{Entity}DetailReadModel`    | 상세 조회        | `ProductDetailReadModel`    |
| `{Entity}ReadModel`          | 단일 목적 조회   | `UserProfileReadModel`      |
| `Admin{Entity}ListReadModel` | 관리자 전용 목록 | `AdminProductListReadModel` |
| `{Context}SummaryReadModel`  | 집계/요약 조회   | `DashboardSummaryReadModel` |

## 목록 조회 ReadModel

```typescript
/**
 * 상품 목록 조회용 ReadModel
 */
export interface ProductListReadModel {
  id: string;
  name: string;
  categoryName: string;
  price: number;
  stockQuantity: number;
  isActive: boolean;
  createdAt: Date;
}
```

## 상세 조회 ReadModel

```typescript
/**
 * 상품 상세 조회용 ReadModel
 *
 * - 카테고리명, 첨부 파일 등 JOIN 데이터를 포함합니다.
 */
export interface ProductDetailReadModel {
  id: string;
  name: string;
  description?: string;
  categoryId: string;
  categoryName: string;
  price: number;
  stockQuantity: number;
  isActive: boolean;
  files: ProductFileReadModel[];
  createdAt: Date;
  updatedAt: Date;
}

/**
 * 상품 첨부 파일 ReadModel
 */
export interface ProductFileReadModel {
  id: string;
  fileName: string;
  fileUrl: string;
  fileSize: number;
}
```

## 집계 ReadModel

```typescript
/**
 * 대시보드 요약 ReadModel
 *
 * - 여러 테이블의 집계 데이터를 합친 요약 정보입니다.
 */
export interface DashboardSummaryReadModel {
  totalProducts: number;
  activeProducts: number;
  totalOrders: number;
  pendingOrders: number;
}
```

## null/undefined 컨벤션

ReadModel은 **내부 레이어(Domain)**에 속하므로 값이 없는 경우 `undefined`를 사용합니다:

```typescript
// ✅ 올바른 예시 (내부 레이어: undefined 사용)
export interface ProductDetailReadModel {
  description?: string; // optional = undefined
  thumbnailUrl?: string;
}

// ❌ 잘못된 예시 (null 사용 금지)
export interface ProductDetailReadModel {
  description: string | null; // 내부 레이어에서 null 사용 금지
}
```

## 중요 규칙

- **한국어 JSDoc 주석**: 각 인터페이스 상단에 용도 설명
- **primitive types + Date만 사용**: `string`, `number`, `boolean`, `Date`
- **Value Objects 사용 금지**: `BoundedString` 등 대신 raw `string` 사용
- **도메인 엔티티 참조 금지**: 조회 결과를 표현하는 순수 데이터 모델
- **인터페이스로 정의** (`class` 아님)
- **중첩 객체 분리**: 복잡한 중첩 객체는 별도 인터페이스로 정의
- **enum 값 주석 명시**: `status: string; // 'draft' | 'active' | 'ended'`
- **nullable 필드는 `?` (optional) 사용**: 내부 레이어이므로 `undefined` 컨벤션

## 언제 사용하는가?

- 복잡한 조인 쿼리 결과
- 여러 엔티티의 데이터를 합친 경우
- 집계 함수 (COUNT, SUM 등) 사용
- API 응답을 위한 최적화된 데이터 모델
