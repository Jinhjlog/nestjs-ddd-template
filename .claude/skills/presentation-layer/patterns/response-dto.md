# Response DTO 작성 규칙

> ⚠️ 예시의 ID 형식(ULID)·페이지네이션 구조(오프셋)는 그 프로젝트 것. **방식·구조는 조사**해 따른다. 필요 시 스키마를 역할×동작별로 격리(+Base 상속) — rules/conventions §3.

Response DTO는 `class`로 정의하며, 모든 필드에 `@ApiProperty()`를 추가합니다.

## 페이지네이션 목록 Response DTO

```typescript
import { ApiProperty } from '@nestjs/swagger';

// 중첩 DTO는 같은 파일에 정의
class NoticeCategoryResponseDto {
  @ApiProperty({
    description: '카테고리 ID (ULID)',
    example: '01HXK3G5N7MZQR8BVWEY6JKFP4',
  })
  id: string;

  @ApiProperty({ description: '카테고리명', example: '채용' })
  name: string;
}

export class NoticeListItemResponseDto {
  @ApiProperty({
    type: String,
    description: '공지사항 ID (ULID)',
    example: '01HXK3G5N7MZQR8BVWEY6JKFP4',
  })
  id: string;

  @ApiProperty({
    type: String,
    description: '제목',
    example: '2024년 서비스 운영 안내',
  })
  title: string;

  @ApiProperty({ type: String, description: '작성자명', example: '관리자' })
  authorName: string;

  @ApiProperty({ type: Number, description: '조회수', example: 123 })
  viewCount: number;

  @ApiProperty({ type: Number, description: '첨부파일 수', example: 2 })
  fileCount: number;

  @ApiProperty({
    type: NoticeCategoryResponseDto,
    nullable: true,
    description: '카테고리 (미분류인 경우 null)',
  })
  category: NoticeCategoryResponseDto | null;

  @ApiProperty({
    type: Date,
    description: '작성일',
    example: '2024-01-01T00:00:00.000Z',
  })
  createdAt: Date;
}

export class NoticeListResponseDto {
  @ApiProperty({ description: '목록', type: [NoticeListItemResponseDto] })
  items: NoticeListItemResponseDto[];

  @ApiProperty({ type: Number, description: '전체 건수', example: 100 })
  totalCount: number;

  @ApiProperty({ type: Number, description: '전체 페이지 수', example: 10 })
  totalPages: number;

  @ApiProperty({ type: Number, description: '현재 페이지', example: 1 })
  currentPage: number;
}
```

---

## 단순 목록 Response DTO

페이지네이션 없이 `{ items }` 구조만 사용 (카테고리, 활성 팝업 등):

```typescript
import { ApiProperty } from '@nestjs/swagger';

export class NoticeCategoryListItemResponseDto {
  @ApiProperty({
    type: String,
    description: '카테고리 ID (ULID)',
    example: '01HXK3G5N7MZQR8BVWEY6JKFP4',
  })
  id: string;

  @ApiProperty({ type: String, description: '카테고리명', example: '공지' })
  name: string;
}

export class NoticeCategoryListResponseDto {
  @ApiProperty({
    description: '카테고리 목록',
    type: [NoticeCategoryListItemResponseDto],
  })
  items: NoticeCategoryListItemResponseDto[];
}
```

---

## 상세 Response DTO

```typescript
import { ApiProperty } from '@nestjs/swagger';

class NoticeFileResponseDto {
  @ApiProperty({ type: String, description: '파일 ID (ULID)' })
  id: string;

  @ApiProperty({ type: String, description: '파일 URL' })
  url: string;

  @ApiProperty({ type: String, description: '원본 파일명' })
  originalName: string;

  @ApiProperty({
    type: String,
    description: 'MIME 타입',
    example: 'application/pdf',
  })
  mimeType: string;

  @ApiProperty({
    type: Number,
    nullable: true,
    description: '파일 크기 (바이트)',
    example: 1024000,
  })
  fileSize: number | null;

  @ApiProperty({ type: Number, description: '정렬 순서', example: 0 })
  sortOrder: number;
}

export class NoticeDetailResponseDto {
  @ApiProperty({ type: String, description: '공지사항 ID (ULID)' })
  id: string;

  @ApiProperty({ type: String, description: '제목' })
  title: string;

  @ApiProperty({ type: String, description: '본문 (HTML)' })
  content: string;

  @ApiProperty({ type: String, description: '작성자명' })
  authorName: string;

  @ApiProperty({ type: Number, description: '조회수' })
  viewCount: number;

  @ApiProperty({ type: Boolean, description: '고정글 여부' })
  isPinned: boolean;

  @ApiProperty({ type: [NoticeFileResponseDto], description: '첨부파일 목록' })
  files: NoticeFileResponseDto[];

  @ApiProperty({
    type: NoticeCategoryResponseDto,
    nullable: true,
    description: '카테고리',
  })
  category: NoticeCategoryResponseDto | null;

  @ApiProperty({ type: Date, description: '생성일' })
  createdAt: Date;

  @ApiProperty({ type: Date, description: '수정일' })
  updatedAt: Date;
}
```

---

## 관리자 상세 Response DTO

공개 API 대비 관리자 전용 필드 추가:

```typescript
export class AdminNoticeDetailResponseDto {
  // ... 공개 API와 동일한 필드

  @ApiProperty({ type: String, description: '작성자 ID (ULID)' })
  authorId: string; // 관리자 전용 필드

  // ...
}
```

---

## status / enum 필드

- 응답의 status 등 enum 필드는 **`string` 타입**으로 두고, 허용값은 `@ApiProperty({ enum: [...] })`에 **리터럴 배열**로 문서화한다. (별도 enum 타입을 응답에 강제하지 않음 — 값은 DB/도메인 그대로 passthrough)
- enum 값 표기(대/소문자 등)는 **DB enum·기존 코드 조사**로 따른다(가정 금지).
- enum 정의는 **모듈 루트 상수 파일로 빼지 말고 인라인**(리터럴 배열).

```typescript
@ApiProperty({ description: '상태', enum: ['pending', 'checked', 'replied'], example: 'pending' })
status: string;
```

## 규칙

| 항목           | 규칙                                                                                      |
| -------------- | ----------------------------------------------------------------------------------------- |
| 정의           | `class` (Swagger 메타데이터)                                                              |
| `@ApiProperty` | 모든 필드에 필수. `type`, `description`, `example` 포함                                   |
| nullable       | `nullable: true` + `type \| null` 타입                                                    |
| 중첩 DTO       | 같은 파일에 non-export 클래스로 정의                                                      |
| 배열 타입      | `type: [ClassName]`                                                                       |
| 페이지네이션   | **방식·구조 조사**(커서/오프셋), 공용 응답 DTO 재사용 (예시의 `totalPages`는 오프셋일 때) |
| 단순 목록      | `items` 배열만                                                                            |
| ID 예시        | **프로젝트 ID 타입에 맞춤**(UUID/ULID 등)                                                 |
| 스키마 격리    | codegen 파급 시 역할×동작별 분리, 공통 코어는 Base 상속 (rules/conventions §3)            |
| 파일명         | 목록: `{entity}-list.response.dto.ts` / 상세: `{entity}-detail.response.dto.ts`           |
| 관리자         | `admin-{entity}-list.response.dto.ts` / `admin-{entity}-detail.response.dto.ts`           |
