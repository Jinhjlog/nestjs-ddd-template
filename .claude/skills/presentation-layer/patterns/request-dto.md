# Request DTO 작성 규칙

> ⚠️ 예시의 ID 타입(ULID 등)·검증 데코레이터는 참고용. **DTO는 타입 가드만**(길이/형식/enum 검증은 VO — rules/validation). ID 타입·표기 관례는 조사해 따른다.

Request DTO는 `class`로 정의하며, `class-validator`와 `@ApiProperty()`를 사용합니다.

## 목록 조회 Query DTO

```typescript
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class GetNoticeListRequestDto {
  @ApiProperty({
    description: '페이지당 조회 건수 (최소 1, 최대 50)',
    example: 20,
    required: false,
    default: 20,
    minimum: 1,
    maximum: 50,
  })
  @Type(() => Number)
  @Min(1)
  @Max(50)
  @IsOptional()
  limit?: number = 20;

  @ApiProperty({
    description: '페이지 번호 (최소 1)',
    example: 1,
    required: false,
    default: 1,
    minimum: 1,
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  page?: number = 1;

  @ApiProperty({
    description: '검색 키워드 (제목 검색)',
    example: '점검',
    required: false,
  })
  @IsString()
  @IsOptional()
  keyword?: string;

  @ApiProperty({
    description: '카테고리 ID (ULID)',
    example: '01HXK3G5N7MZQR8BVWEY6JKFP4',
    required: false,
  })
  @IsString()
  @IsOptional()
  categoryId?: string;
}
```

**규칙:**

- Query 파라미터는 문자열이므로 `@Type(() => Number)` 변환 필수
- `@Min()`, `@Max()`로 범위 제한
- 공개 API: `@Max(50)` / 관리자 API: `@Max(100)`
- 기본값 설정: `limit?: number = 20`, `page?: number = 1`

---

## 생성 Request DTO

```typescript
import { ApiProperty } from '@nestjs/swagger';
import {
  IsArray,
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';

export class CreateNoticeRequestDto {
  @ApiProperty({
    type: String,
    description: '제목 (최대 255자)',
    example: '2024년 서비스 운영 안내',
  })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({
    type: String,
    description: '본문 내용 (HTML)',
    example: '<p>안녕하세요.</p>',
  })
  @IsString()
  @IsNotEmpty()
  content: string;

  @ApiProperty({
    type: String,
    description: '카테고리 ID (ULID)',
    example: '01HXK3G5N7MZQR8BVWEY6JKFP4',
    required: false,
  })
  @IsString()
  @IsOptional()
  categoryId?: string;

  @ApiProperty({
    type: Boolean,
    description: '고정글 여부 (기본값 false)',
    example: false,
    required: false,
    default: false,
  })
  @IsBoolean()
  @IsOptional()
  isPinned?: boolean = false;

  @ApiProperty({
    description: '첨부파일 ID 목록',
    type: [String],
    example: ['01HXK3G5N7MZQR8BVWEY6JKFP4'],
    required: false,
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  fileIds?: string[];
}
```

---

## 수정 Request DTO

모든 필드 선택적 (부분 업데이트). nullable 필드는 `null` 전달로 값 제거.

```typescript
import { ApiProperty } from '@nestjs/swagger';
import {
  IsArray,
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsString,
  ValidateIf,
} from 'class-validator';

export class UpdateNoticeRequestDto {
  @ApiProperty({
    type: String,
    description: '제목 (최대 255자)',
    example: '수정된 제목',
    required: false,
  })
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  title?: string;

  @ApiProperty({
    type: String,
    description: '본문 내용 (HTML)',
    example: '<p>수정된 내용</p>',
    required: false,
  })
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  content?: string;

  // nullable 필드: null 전달 시 값 제거
  @ApiProperty({
    type: String,
    description: '카테고리 ID (null 전달 시 미분류로 해제)',
    example: '01HXK3G5N7MZQR8BVWEY6JKFP4',
    required: false,
    nullable: true,
  })
  @ValidateIf((_, value) => value !== null)
  @IsString()
  @IsOptional()
  categoryId?: string | null;

  // 배열 추가/삭제 패턴
  @ApiProperty({
    description: '추가할 첨부파일 ID 목록',
    type: [String],
    required: false,
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  addFileIds?: string[];

  @ApiProperty({
    description: '삭제할 첨부파일 ID 목록',
    type: [String],
    required: false,
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  removeFileIds?: string[];
}
```

---

## Update 필드 상태 구분

| 클라이언트 전송    | 타입        | 의미           |
| ------------------ | ----------- | -------------- |
| 필드 미포함        | `undefined` | 수정하지 않음  |
| `"field": null`    | `null`      | 값 제거        |
| `"field": "value"` | 값          | 새 값으로 수정 |

---

## 규칙

| 항목           | 규칙                                                                                   |
| -------------- | -------------------------------------------------------------------------------------- |
| 정의           | `class` (런타임 검증 + Swagger)                                                        |
| Query 숫자     | `@Type(() => Number)` 변환 필수                                                        |
| 필수 필드      | `@IsNotEmpty()` + `@IsString()` 등                                                     |
| 선택 필드      | `@IsOptional()` + `required: false` + `?` 타입                                         |
| nullable 필드  | `@ValidateIf((_, value) => value !== null)` + `nullable: true` + `type \| null`        |
| 배열           | `@IsArray()` + `@IsString({ each: true })`                                             |
| Date           | `@Type(() => Date)` + `@IsDate()`                                                      |
| ID 타입        | **조사**(UUID/ULID 등). DTO에선 `@IsString()` 정도, 검증 파이프 사용 여부도 조사       |
| 엔티티 필드 검증 | **DTO 금지 → VO 책임** (엔티티 필드의 `@MaxLength`/`@IsEmail`/`@IsEnum` 쓰지 않음, rules/validation) |
| 쿼리 입력 가드  | 페이지네이션 `limit` 같은 **쿼리 파라미터 입력 범위**는 presentation 가드로 `@Min`/`@Max` 허용 (엔티티 비즈니스 규칙 아님) |
| `@ApiProperty` | `type`, `description`, `example` 필수                                                  |
