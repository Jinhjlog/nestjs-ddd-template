# Query Service 구현체 작성 패턴

Query Service는 조회 전용 쿼리를 Prisma로 구현합니다. ReadModel을 반환하며 별도의 Mapper 없이 인라인으로 변환합니다.

## 패턴 1: findList + countList 쌍 (가장 일반적)

오프셋 기반 페이지네이션의 기본 패턴입니다. 동적 WHERE 조건을 공유합니다:

```typescript
import { Injectable } from '@nestjs/common';
import { PrismaService } from '@core/database/prisma.service';
import {
  ArticleQueryService,
  FindArticleListParams,
  CountArticleListParams,
} from '../../domain/services';
import {
  ArticleListReadModel,
  ArticleDetailReadModel,
} from '../../domain/models';

@Injectable()
export class ArticleQueryServiceImpl implements ArticleQueryService {
  constructor(private readonly prisma: PrismaService) {}

  async findList(
    params: FindArticleListParams,
  ): Promise<ArticleListReadModel[]> {
    const { skip, limit, keyword, categoryId } = params;

    const results = await this.prisma.article.findMany({
      where: this.buildListWhere({ keyword, categoryId }),
      include: {
        category: true,
        _count: { select: { files: true } },
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      skip,
      take: limit,
    });

    return results.map((item) => ({
      id: item.id,
      title: item.title,
      authorName: item.authorName,
      categoryName: item.category !== null ? item.category.name : undefined,
      fileCount: item._count.files,
      createdAt: item.createdAt,
    }));
  }

  async countList(params: CountArticleListParams): Promise<number> {
    const { keyword, categoryId } = params;

    return this.prisma.article.count({
      where: this.buildListWhere({ keyword, categoryId }),
    });
  }

  async findDetailById(
    id: string,
  ): Promise<ArticleDetailReadModel | undefined> {
    const item = await this.prisma.article.findUnique({
      where: { id, deletedAt: null },
      include: {
        category: true,
        files: { orderBy: { sortOrder: 'asc' } },
      },
    });

    if (!item) return undefined;

    return {
      id: item.id,
      title: item.title,
      content: item.content,
      authorName: item.authorName,
      categoryName: item.category !== null ? item.category.name : undefined,
      files: item.files.map((f) => ({
        id: f.id,
        fileName: f.fileName,
        fileUrl: f.fileUrl,
        fileSize: f.fileSize,
      })),
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    };
  }

  /** WHERE 조건을 findList/countList에서 공유합니다 */
  private buildListWhere(filter: { keyword?: string; categoryId?: string }) {
    return {
      deletedAt: null,
      ...(filter.keyword && {
        OR: [
          { title: { contains: filter.keyword } },
          { authorName: { contains: filter.keyword } },
        ],
      }),
      ...(filter.categoryId && { categoryId: filter.categoryId }),
    };
  }
}
```

## 패턴 1-C: 커서 페이지네이션 (프로젝트가 커서 방식일 때)

오프셋 대신 **커서**를 쓰는 프로젝트에서 사용. `limit + 1`로 조회해 다음 페이지 존재를 판단하고, 정렬은 `created_at` + `id` 복합으로 안정화한다. (응답 `nextCursor`/`hasNext` 가공은 보통 UseCase의 `CursorUtil.paginate`가 담당)

```typescript
async findList(params: FindXxxListParams): Promise<XxxListItemReadModel[]> {
  const where: Prisma.xxxWhereInput = {};

  // 상태 등 필터 (enum 컬럼이면 캐스팅)
  if (params.status) {
    where.status = params.status as xxx_status;
  }
  // 커서: (created_at < cursor.createdAt) OR (created_at = cursor.createdAt AND id < cursor.id)
  if (params.cursor) {
    where.OR = [
      { created_at: { lt: new Date(params.cursor.createdAt) } },
      {
        created_at: new Date(params.cursor.createdAt),
        id: { lt: params.cursor.id },
      },
    ];
  }

  const rows = await this.prisma.xxx.findMany({
    where,
    orderBy: [{ created_at: 'desc' }, { id: 'desc' }],
    take: params.limit, // UseCase에서 limit+1을 넘겨 hasNext 판단
  });

  return rows.map((r) => ({
    id: r.id,
    // 긴 본문은 목록에서 미리보기로 가공
    contentPreview: r.content.substring(0, 100),
    status: r.status,
    // null → undefined (삼항, ?? 금지)
    memo: r.memo !== null ? r.memo : undefined,
    createdAt: r.created_at,
  }));
}
```

> 페이지네이션 방식(커서/오프셋)·공용 유틸은 **기존 코드 조사**로 따른다.

## 패턴 2: \_count 집계

Prisma의 `_count` 기능으로 관계 카운트를 조회합니다:

```typescript
async findCategoryList(): Promise<CategoryListReadModel[]> {
  const categories = await this.prisma.category.findMany({
    where: { isActive: true },
    include: { _count: { select: { products: true } } },
    orderBy: { sortOrder: 'asc' },
  });

  return categories.map((cat) => ({
    id: cat.id,
    name: cat.name,
    productCount: cat._count.products,   // _count 활용
    createdAt: cat.createdAt,
  }));
}
```

## 패턴 3: $queryRaw + 동적 WHERE

복잡한 조인, 집계, 정렬이 필요할 때 `$queryRaw`를 사용합니다:

```typescript
import { Prisma } from '@prisma/generated/client';

/** Raw SQL 결과 행 타입을 별도 인터페이스로 정의 */
interface ProductStatsRow {
  categoryId: string;
  categoryName: string;
  totalProducts: bigint;
  averagePrice: number;
}

async findProductStats(
  filter: { categoryId?: string; keyword?: string },
): Promise<ProductStatsReadModel[]> {
  // 동적 WHERE 조건 구성
  const conditions: Prisma.Sql[] = [
    Prisma.sql`p.is_active = true`,
    Prisma.sql`p.deleted_at IS NULL`,
  ];

  if (filter.keyword) {
    const keyword = `%${filter.keyword}%`;
    conditions.push(Prisma.sql`p.name LIKE ${keyword}`);
  }

  if (filter.categoryId) {
    conditions.push(Prisma.sql`p.category_id = ${filter.categoryId}`);
  }

  const whereClause = Prisma.sql`WHERE ${Prisma.join(conditions, ' AND ')}`;

  const rows = await this.prisma.$queryRaw<ProductStatsRow[]>`
    SELECT
      c.id            AS categoryId,
      c.name          AS categoryName,
      COUNT(p.id)     AS totalProducts,
      AVG(p.price)    AS averagePrice
    FROM products p
    INNER JOIN categories c ON c.id = p.category_id
    ${whereClause}
    GROUP BY c.id, c.name
    ORDER BY c.name ASC
  `;

  return rows.map((row) => ({
    categoryId: row.categoryId,
    categoryName: row.categoryName,
    totalProducts: Number(row.totalProducts),  // bigint → number
    averagePrice: row.averagePrice,
  }));
}
```

## 조회 방식 선택 가이드

| 조건                        | 방식                          | 예시               |
| --------------------------- | ----------------------------- | ------------------ |
| 단순 목록/상세 (1-2 테이블) | `findMany` + `include`        | 게시글 목록, 상세  |
| 관계 카운트만 필요          | `include: { _count: {...} }`  | 카테고리별 항목 수 |
| 복잡한 조인 (3+ 테이블)     | `$queryRaw`                   | 집계 통계          |
| 집계 함수 (COUNT, SUM, AVG) | `$queryRaw`                   | 통계 대시보드      |
| 동적 WHERE 조건 (Raw SQL)   | `$queryRaw` + `Prisma.join()` | 필터링 검색        |

## WHERE 동적 구성 패턴 (findMany)

```typescript
// Spread operator 패턴 - findMany/count에서 사용
const where = {
  deletedAt: null,
  ...(keyword && { title: { contains: keyword } }),
  ...(categoryId && { categoryId }),
  ...(isActive !== undefined && { isActive }),
};

// OR 조건
const where = {
  deletedAt: null,
  ...(keyword && {
    OR: [
      { title: { contains: keyword } },
      { authorName: { contains: keyword } },
    ],
  }),
};
```

## Raw SQL 타입 변환

| Prisma Raw 타입 | ReadModel 타입 | 변환 방법                      |
| --------------- | -------------- | ------------------------------ |
| `bigint`        | `number`       | `Number()`                     |
| `number` (0/1)  | `boolean`      | `Number(field) === 1`          |
| `Date`          | `Date`         | 그대로                         |
| `string`        | `string`       | 그대로                         |
| `null`          | `undefined`    | `!== null ? field : undefined` |

## 중요 규칙

- ReadModel은 **primitive types**만 사용 (string, number, boolean, Date)
- Query Service에서 **별도 Mapper 없이** 인라인으로 ReadModel 변환
- null → undefined 변환 필수 (Domain 내부 레이어 규칙)
- **findList + countList WHERE 조건 공유**: `buildListWhere()` 같은 private 메서드로 추출
- bigint → number 변환: `Number()` 사용
- 동적 WHERE (Raw SQL): `Prisma.sql` + `Prisma.join(conditions, ' AND ')`
- **파일 위치**: `infra/services/{service-name}-query.service.impl.ts`

## 주의사항

- ❌ Query Service에서 write 작업 금지
- ❌ Domain Entity 반환 금지 (ReadModel만 반환)
- ❌ 별도 Mapper 클래스 생성 금지 (인라인 변환)
- ✅ bigint → number 변환 필수
- ✅ SQL Injection 방지 (Prisma parameterized query 사용)
- ✅ Raw SQL 결과 타입은 별도 인터페이스로 정의
