# Transformer 작성 규칙

> ⚠️ 페이지네이션 예시(`totalCount`/`totalPages`)는 오프셋 기준. 커서 방식이면 그에 맞춤 — **방식은 조사**. `undefined → null`은 삼항(`??` 금지).

Transformer는 Domain ReadModel을 Presentation Response DTO로 변환합니다.

## 페이지네이션 목록 변환

UseCase가 `{ items, totalCount, totalPages, currentPage }` 객체를 반환하는 경우:

```typescript
import { NoticeListReadModel } from '../../domain/models';
import { NoticeListResponseDto } from '../dtos/response';

export class NoticeTransformer {
  private static toListItem(item: NoticeListReadModel) {
    return {
      id: item.id,
      title: item.title,
      authorName: item.authorName,
      viewCount: item.viewCount,
      fileCount: item.fileCount,
      category:
        item.category !== undefined
          ? { id: item.category.id, name: item.category.name }
          : null,
      createdAt: item.createdAt,
    };
  }

  static toListResponse(result: {
    items: NoticeListReadModel[];
    totalCount: number;
    totalPages: number;
    currentPage: number;
  }): NoticeListResponseDto {
    return {
      items: result.items.map((item) => NoticeTransformer.toListItem(item)),
      totalCount: result.totalCount,
      totalPages: result.totalPages,
      currentPage: result.currentPage,
    };
  }
}
```

## 커서 페이지네이션 목록 변환 (프로젝트가 커서 방식일 때)

UseCase가 `{ items, nextCursor?, hasNext }`를 반환하는 경우. `nextCursor`는 `undefined → null` **삼항**으로 변환(`??` 금지):

```typescript
static toListResponse(result: {
  items: XxxListItemReadModel[];
  nextCursor?: string;
  hasNext: boolean;
}): XxxListResponseDto {
  return {
    items: result.items.map((item) => ({
      id: item.id,
      contentPreview: item.contentPreview,
      status: item.status,
      createdAt: item.createdAt,
    })),
    nextCursor: result.nextCursor !== undefined ? result.nextCursor : null,
    hasNext: result.hasNext,
  };
}
```

## 단순 목록 변환

UseCase가 `ReadModel[]` 배열을 직접 반환하는 경우 (카테고리, 활성 팝업 등):

```typescript
import { NoticeCategoryReadModel } from '../../domain/models';
import { NoticeCategoryListResponseDto } from '../dtos/response';

export class NoticeCategoryTransformer {
  static toListResponse(
    readModels: NoticeCategoryReadModel[],
  ): NoticeCategoryListResponseDto {
    return {
      items: readModels.map((readModel) => ({
        id: readModel.id,
        name: readModel.name,
      })),
    };
  }
}
```

## 상세 변환

```typescript
static toDetailResponse(
  readModel: NoticeDetailReadModel,
): NoticeDetailResponseDto {
  return {
    id: readModel.id,
    title: readModel.title,
    content: readModel.content,
    authorName: readModel.authorName,
    viewCount: readModel.viewCount,
    isPinned: readModel.isPinned,
    files: readModel.files.map((file) => ({
      id: file.id,
      url: file.url,
      originalName: file.originalName,
      mimeType: file.mimeType,
      fileSize: file.fileSize !== undefined ? file.fileSize : null,
      sortOrder: file.sortOrder,
    })),
    category: readModel.category !== undefined
      ? { id: readModel.category.id, name: readModel.category.name }
      : null,
    createdAt: readModel.createdAt,
    updatedAt: readModel.updatedAt,
  };
}
```

---

## nullable 변환 규칙

Domain(ReadModel)은 `undefined`를 사용하고, API 응답(Response DTO)은 `null`을 사용합니다.
Transformer에서 `undefined → null` 변환 시 **반드시 삼항 연산자**를 사용합니다.

```typescript
// 단순 필드
description: readModel.description !== undefined ? readModel.description : null,

// 중첩 객체
category: readModel.category !== undefined
  ? { id: readModel.category.id, name: readModel.category.name }
  : null,

// 배열 내 필드
files: readModel.files.map((file) => ({
  fileSize: file.fileSize !== undefined ? file.fileSize : null,
})),
```

> `?? null` 사용 금지. 삼항 연산자를 사용합니다.

---

## 규칙

| 항목     | 규칙                                                               |
| -------- | ------------------------------------------------------------------ |
| 메서드   | `static` 메서드만 사용 (인스턴스 없음)                             |
| 네이밍   | `toListResponse()`, `toDetailResponse()`, `toActiveListResponse()` |
| 헬퍼     | 반복 로직은 `private static toListItem()` 헬퍼로 추출              |
| nullable | `!== undefined ? value : null` 삼항 연산자 필수                    |
| 배열     | `.map()` 사용                                                      |
| 입력     | 페이지네이션: UseCase 결과 객체(`{ items, … }`) / 단순: ReadModel 배열 |
| 출력     | Response DTO 타입                                                  |

## 금지 사항

- Controller에서 인라인 맵핑 금지 (반드시 Transformer 사용)
- `?? null` 사용 금지
- Transformer에 비즈니스 로직 작성 금지
