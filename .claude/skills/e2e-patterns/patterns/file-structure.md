# E2E 테스트 파일 구조 패턴

> ⚠️ 예시의 import 경로·`seedAdmin`·`ulid`·페이지네이션 필드(`totalPages`)·에러코드는 **그 프로젝트 것**. **기존 참조 테스트 조사**로 실제 경로/헬퍼/값을 쓴다. import 순서·파일 레이아웃 같은 *구조*만 참고.

## 완전한 파일 구조 예시

```typescript
// ─── Import ─────────────────────────────────────────────────────────────

// 외부 라이브러리
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';

// 내부 모듈 (ORM 서비스)
import { PrismaService } from '../../src/module/core/database/prisma.service';

// 테스트 헬퍼
import { createTestApp } from '../helpers/test-app.helper';
import { cleanDatabase } from '../helpers/db-cleanup.helper';
import { expectError, expectSuccess } from '../helpers/assertion.helper';

// Seed 함수
import {
  seedAdmin,
  seedNotice,
  seedNoticeCategory,
  seedUploadedFile,
} from '../helpers/seed.helper';

// 기타 유틸 (필요시)
import { ulid } from 'ulid';

// ─── 응답 타입 ──────────────────────────────────────────────────────────────

interface NoticeListItemBody {
  id: string;
  title: string;
  authorName: string;
  viewCount: number;
  isPinned: boolean;
  fileCount: number;
  category: { id: string; name: string } | null;
  createdAt: string;
}

interface NoticeListBody {
  pinnedItems: NoticeListItemBody[];
  items: NoticeListItemBody[];
  totalCount: number;
  totalPages: number;
  currentPage: number;
}

interface NoticeFileBody {
  id: string;
  url: string;
  originalName: string;
  mimeType: string;
  fileSize: number | null;
  sortOrder: number;
}

interface NoticeDetailBody {
  id: string;
  title: string;
  content: string;
  authorName: string;
  viewCount: number;
  isPinned: boolean;
  files: NoticeFileBody[];
  category: { id: string; name: string } | null;
  createdAt: string;
  updatedAt: string;
}

// 관리자 전용 필드가 있으면 extends로 확장
interface AdminNoticeDetailBody extends NoticeDetailBody {
  authorId: string;
}

interface AdminNoticeListBody {
  items: NoticeListItemBody[];
  totalCount: number;
  totalPages: number;
  currentPage: number;
}

// ─── 상수 ───────────────────────────────────────────────────────────────────

const LOGIN_URL = '/api/v1/admin-auth/login';
const NOTICES_URL = '/api/v1/notices';
const ADMIN_NOTICES_URL = '/api/v1/admin/notices';
const VALID_PASSWORD = 'P@ssw0rd!';
const ADMIN_LOGIN_ID = 'notice-test-admin';

// ─── 테스트 ─────────────────────────────────────────────────────────────────

describe('공지사항 (Notice) E2E', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);
  });

  afterAll(async () => {
    if (app) await app.close();
  });

  beforeEach(async () => {
    await cleanDatabase(prisma);
  });

  /** 관리자 로그인 후 accessToken을 반환하는 헬퍼 */
  async function login(
    loginId: string,
    password: string,
  ): Promise<{ accessToken: string }> {
    const response = await request(app.getHttpServer())
      .post(LOGIN_URL)
      .send({ loginId, password });

    return response.body as { accessToken: string };
  }

  /** CONFIRMED 상태의 업로드 파일을 생성하는 커스텀 헬퍼 (필요시) */
  async function seedConfirmedFile(
    uploadedBy: string,
    overrides: { originalName?: string; mimeType?: string } = {},
  ) {
    return seedUploadedFile(prisma, {
      uploadedBy,
      purpose: 'notice',
      status: 'CONFIRMED',
      confirmedAt: new Date(),
      originalName: overrides.originalName ?? 'test-file.pdf',
      mimeType: overrides.mimeType ?? 'application/pdf',
    });
  }

  // ─── GET /api/v1/notices ────────────────────────────────────────

  describe('GET /api/v1/notices', () => {
    it('TC-NOTC-001: 공지사항 목록 조회 성공 (고정글 + 일반글)', async () => {
      // Given
      const admin = await seedAdmin(prisma, { role: 'ADMIN' });
      const category = await seedNoticeCategory(prisma, { name: '공고' });

      await seedNotice(prisma, {
        title: '시설 이용 안내',
        isPinned: true,
        authorId: admin.id,
        authorName: admin.name,
        categoryId: category.id,
      });
      await seedNotice(prisma, {
        title: '일반 공지 1',
        isPinned: false,
        authorId: admin.id,
        authorName: admin.name,
      });

      // When
      const response = await request(app.getHttpServer()).get(NOTICES_URL);

      // Then
      const body = expectSuccess<NoticeListBody>(response, 200);
      expect(body.pinnedItems).toHaveLength(1);
      expect(body.pinnedItems[0].title).toBe('시설 이용 안내');
      expect(body.items).toHaveLength(1);
      expect(body.totalCount).toBe(1); // totalCount는 일반글만
    });
  });

  // ─── POST /api/v1/admin/notices ─────────────────────────────────

  describe('POST /api/v1/admin/notices', () => {
    it('TC-NOTC-006: 관리자 공지사항 등록 성공', async () => {
      // Given
      await seedAdmin(prisma, {
        loginId: ADMIN_LOGIN_ID,
        password: VALID_PASSWORD,
        role: 'ADMIN',
      });
      const category = await seedNoticeCategory(prisma, { name: '일반' });
      const { accessToken } = await login(ADMIN_LOGIN_ID, VALID_PASSWORD);

      // When
      const response = await request(app.getHttpServer())
        .post(ADMIN_NOTICES_URL)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          title: '새 공지사항',
          content: '<p>내용입니다</p>',
          categoryId: category.id,
        });

      // Then
      const body = expectSuccess<AdminNoticeDetailBody>(response, 201);
      expect(body).toHaveProperty('id');
      expect(body.title).toBe('새 공지사항');
      expect(body.content).toBe('<p>내용입니다</p>');
    });

    it('TC-NOTC-010: 인증 없이 공지사항 등록 시 실패', async () => {
      // When
      const response = await request(app.getHttpServer())
        .post(ADMIN_NOTICES_URL)
        .send({ title: '테스트', content: '<p>내용</p>' });

      // Then
      expectError(response, {
        statusCode: 401,
        errorCode: 'ACCESS_TOKEN_MISSING',
      });
    });
  });
});
```

## Import 순서 규칙

```
1) 외부 라이브러리 (@nestjs, supertest 등)
2) 내부 모듈 (ORM 서비스, 기타 앱 내부 모듈)
3) 테스트 헬퍼 (test-app, db-cleanup, assertion)
4) Seed 함수 (seed.helper 배럴에서 import)
5) 기타 유틸 (ulid 등 - 필요시)
```

## 응답 타입 인터페이스 규칙

- 각 테스트 파일 최상단에 로컬 정의 (공유하지 않음)
- 명명: `{Entity}ListBody`, `{Entity}DetailBody`, `Admin{Entity}DetailBody`
- 관리자 전용 필드: `extends`로 기본 인터페이스 확장
- 목록: `items` 배열 + 페이지네이션 필드 (`totalCount`, `totalPages`, `currentPage`)
- 고정글이 있는 모듈: `pinnedItems` 별도 배열
- 파일 첨부: `files: FileBody[]` 배열
- nullable 필드: `| null`
- 날짜 필드: `string`

## 상수 정의 규칙

- 로그인 URL, 엔드포인트 URL, 비밀번호, 로그인 ID 등
- 파일 최상단 (describe 외부)
- `const`로 선언

## 섹션 구분선 스타일

```typescript
// ─── 응답 타입 ──────────────────────────────────────────────────────────────
// ─── 상수 ───────────────────────────────────────────────────────────────────
// ─── 테스트 ─────────────────────────────────────────────────────────────────
// ─── GET /api/v1/notices ────────────────────────────────────────
```

- 3중 대시 (`───`) 사용
- 섹션명을 한국어로
- 엔드포인트 구분은 `METHOD /path` 형식

## 커스텀 헬퍼 패턴

테스트 파일 내부에서 반복되는 seed 조합을 헬퍼로 추출:

```typescript
/** CONFIRMED 상태의 업로드 파일을 생성하는 헬퍼 */
async function seedConfirmedFile(
  uploadedBy: string,
  overrides: { originalName?: string; mimeType?: string } = {},
) {
  return seedUploadedFile(prisma, {
    uploadedBy,
    purpose: 'notice',
    status: 'CONFIRMED',
    confirmedAt: new Date(),
    originalName: overrides.originalName ?? 'test-file.pdf',
    mimeType: overrides.mimeType ?? 'application/pdf',
  });
}
```

## Seed 파일 구조 / 등록 (신규 모듈)

테스트용 seed 헬퍼는 모듈별 파일로 두고 배럴에 등록한다(경로·헬퍼명은 기존 구조 조사):

```
test/helpers/seed/
├── index.ts            # 배럴 — 모든 seed re-export
├── <module>.seed.ts    # createTest<Entity>(prisma, overrides) → prisma.<table>.create(...)
└── ...
```

신규 모듈 추가 절차:
1. `test/helpers/seed/<module>.seed.ts` 생성 — `createTest<Entity>(prisma, overrides)` (overrides로 기본값 오버라이드, 반환 타입 인터페이스 정의)
2. `test/helpers/seed/index.ts`에 `export * from './<module>.seed';` 추가
3. (DB 정리는 보통 전체 truncate 헬퍼라 테이블 추가 불필요 — 기존 `db-cleanup` 방식 조사)
