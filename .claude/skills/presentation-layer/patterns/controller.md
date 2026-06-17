# Controller 작성 규칙

> ⚠️ 예시의 구체 값(ID 타입, 인증 데코레이터 `@AdminAuth`, 경로 등)은 **그 프로젝트 것**이다. **패턴 구조만 참고**하고, 실제 값은 기존 코드 조사로 따른다(rules/conventions §1). 검증은 VO(rules/validation).

## 공개 API 컨트롤러

인증 불필요. GET 엔드포인트만 제공.

```typescript
import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Query,
} from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { ApiProblemResponse } from '@shared/swagger';

@ApiTags('공지사항')
@Controller({ path: 'notices', version: '1' })
export class NoticeController {
  constructor(
    private readonly findNoticeListUseCase: FindNoticeListUseCase,
    private readonly findNoticeDetailUseCase: FindNoticeDetailUseCase,
  ) {}

  // 목록 조회 (페이지네이션)
  @ApiOperation({
    summary: '공지사항 목록 조회',
    description:
      '공지사항 목록을 조회합니다.<br><br>' +
      '**검색 조건**<br>' +
      '- keyword: 제목 검색 (최대 300자)<br>' +
      '- categoryId: 카테고리별 필터링<br><br>' +
      '**페이지네이션**<br>' +
      '- page: 페이지 번호 (기본값 1)<br>' +
      '- limit: 페이지당 건수 (기본값 20, 최대 50)<br>',
  })
  @ApiOkResponse({ description: '목록 조회 성공', type: NoticeListResponseDto })
  @ApiProblemResponse(
    HttpStatus.BAD_REQUEST,
    '잘못된 요청<br>' +
      '- 검색 키워드가 너무 긴 경우 (최대 300자): _**KEYWORD_TOO_LONG**_<br>',
  )
  @HttpCode(HttpStatus.OK)
  @Get()
  async getNoticeList(
    @Query() dto: GetNoticeListRequestDto,
  ): Promise<NoticeListResponseDto> {
    const result = await this.findNoticeListUseCase.execute({
      limit: dto.limit ?? 20,
      page: dto.page ?? 1,
      keyword: dto.keyword,
      categoryId: dto.categoryId,
    });
    return NoticeTransformer.toListResponse(result);
  }

  // 상세 조회
  @ApiOperation({
    summary: '공지사항 상세 조회',
    description: '공지사항의 상세 정보를 조회합니다.<br>',
  })
  @ApiParam({
    name: 'noticeId',
    description: '공지사항 ID (ULID)',
    example: '01HXK3G5N7MZQR8BVWEY6JKFP4',
  })
  @ApiOkResponse({
    description: '상세 조회 성공',
    type: NoticeDetailResponseDto,
  })
  @ApiProblemResponse(
    HttpStatus.NOT_FOUND,
    '공지사항을 찾을 수 없음: _**NOTICE_NOT_FOUND**_',
  )
  @HttpCode(HttpStatus.OK)
  @Get(':noticeId')
  async getNoticeDetail(
    @Param('noticeId') id: string,
  ): Promise<NoticeDetailResponseDto> {
    const detail = await this.findNoticeDetailUseCase.execute(id);
    return NoticeTransformer.toDetailResponse(detail);
  }
}
```

---

## 관리자 API 컨트롤러

> **인증/인가 방식은 프로젝트마다 다를 수 있습니다.**
> 구현 전 반드시 해당 프로젝트의 기존 인증 데코레이터, Guard, 사용자 정보 주입 방식을 파악한 후 동일하게 적용합니다.

클래스 레벨 `@AdminAuth()`. CRUD 전체 제공.

```typescript
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { ApiProblemResponse } from '@shared/swagger';
import { AdminAuth } from '../../../admin/presentation/decorators/admin-auth.decorator';
import { CurrentAdmin } from '../../../admin/presentation/decorators/current-admin.decorator';
import type { AuthenticatedAdmin } from '../../../admin/presentation/guards';

@ApiTags('관리자 - 공지사항')
@AdminAuth()
@Controller({ path: 'admin/notices', version: '1' })
export class AdminNoticeController {
  constructor(
    private readonly findAdminNoticeListUseCase: FindAdminNoticeListUseCase,
    private readonly findAdminNoticeDetailUseCase: FindAdminNoticeDetailUseCase,
    private readonly createNoticeUseCase: CreateNoticeUseCase,
    private readonly updateNoticeUseCase: UpdateNoticeUseCase,
    private readonly deleteNoticeUseCase: DeleteNoticeUseCase,
  ) {}

  // GET — 목록 조회
  @HttpCode(HttpStatus.OK)
  @Get()
  async getAdminNoticeList(
    @Query() dto: GetAdminNoticeListRequestDto,
  ): Promise<AdminNoticeListResponseDto> {
    const result = await this.findAdminNoticeListUseCase.execute({
      limit: dto.limit ?? 20,
      page: dto.page ?? 1,
      keyword: dto.keyword,
    });
    return AdminNoticeTransformer.toListResponse(result);
  }

  // GET — 상세 조회
  @HttpCode(HttpStatus.OK)
  @Get(':noticeId')
  async getAdminNoticeDetail(
    @Param('noticeId') id: string,
  ): Promise<AdminNoticeDetailResponseDto> {
    const detail = await this.findAdminNoticeDetailUseCase.execute(id);
    return AdminNoticeTransformer.toDetailResponse(detail);
  }

  // POST — 생성 (커맨드 응답 = XxxCommandResponseDto, 쿼리 DetailResponseDto와 분리)
  @HttpCode(HttpStatus.CREATED)
  @Post()
  async createNotice(
    @Body() dto: CreateNoticeRequestDto,
    @CurrentAdmin() admin: AuthenticatedAdmin,
  ): Promise<AdminNoticeCommandResponseDto> {
    const notice = await this.createNoticeUseCase.execute({
      title: dto.title,
      content: dto.content,
      authorName: admin.name,
      authorId: admin.adminId,
    });
    // 재조회 X — UseCase가 반환한 Primitives를 커맨드 전용 메서드로 매핑
    return AdminNoticeTransformer.fromPrimitives(notice);
  }

  // PATCH — 수정
  @HttpCode(HttpStatus.OK)
  @Patch(':noticeId')
  async updateNotice(
    @Param('noticeId') id: string,
    @Body() dto: UpdateNoticeRequestDto,
  ): Promise<AdminNoticeCommandResponseDto> {
    const notice = await this.updateNoticeUseCase.execute({ id, ...dto });
    // 재조회 X — Primitives → 커맨드 전용 fromPrimitives
    return AdminNoticeTransformer.fromPrimitives(notice);
  }

  // DELETE — 삭제 (Soft Delete)
  @HttpCode(HttpStatus.NO_CONTENT)
  @Delete(':noticeId')
  async deleteNotice(@Param('noticeId') id: string): Promise<void> {
    await this.deleteNoticeUseCase.execute(id);
  }
}
```

---

## 규칙

| 항목               | 규칙                                                                                          |
| ------------------ | --------------------------------------------------------------------------------------------- |
| 공개 API 경로      | `/{entities}`                                                                                 |
| 관리자 API 경로    | `/admin/{entities}`                                                                           |
| 인증               | **프로젝트의 인증 데코레이터·가드를 조사**해 적용 (예시의 `@AdminAuth`는 그 프로젝트 것일 뿐) |
| 인증 Swagger       | 인증 데코레이터가 **401/403을 자동 부착**하면 컨트롤러에서 `@ApiUnauthorizedResponse`/`@ApiForbiddenResponse` **중복 작성 금지** (조사로 확인) |
| 사용자/관리자 정보 | 프로젝트의 current-user류 데코레이터 조사                                                     |
| ID 파라미터        | **ID 타입·파이프는 조사**(UUID면 검증 파이프, ULID면 문자열 등)                               |
| 클라이언트 IP      | `@Ip()` **지양**(프록시 IP 위험) → `@Req()` + `x-forwarded-for` 우선 파싱(없으면 `req.ip`). 취득 방식은 기존 코드 조사 |
| 목록 조회          | `@Query() dto` 사용. 페이지네이션 방식(커서/오프셋)·기본값은 조사                              |
| 수정/생성 응답     | command UseCase가 반환한 **`XxxPrimitives`(애그리거트 `toPrimitives()`, 재조회 X)** → Transformer **`fromPrimitives`** → **`XxxCommandResponseDto`**(쿼리 `XxxDetailResponseDto`와 **완전 분리**, 공유·상속 금지) (`api-response.md §8`) |
| 응답 변환          | 반드시 Transformer 사용 — 인라인 맵핑 금지                                                    |
| HttpCode           | GET: OK, POST: CREATED, PATCH: OK, DELETE: NO_CONTENT                                         |

```typescript
// 클라이언트 IP 취득 (프록시 고려)
const forwarded = req.headers['x-forwarded-for'];
const ip = typeof forwarded === 'string' ? forwarded.split(',')[0].trim() : req.ip || '';
```
| Swagger            | 모든 엔드포인트에 `@ApiOperation` + 응답/에러 데코레이터 필수                                 |
| description        | 한국어, HTML `<br>` 줄바꿈, 에러코드 `_**ERROR_CODE**_` 형식                                  |
