import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { join, dirname } from 'path';
import { promises as fs } from 'fs';
import { PrismaService } from '../../src/module/core/database/prisma.service';
import { createTestApp } from '../helpers/test-app.helper';
import { cleanDatabase } from '../helpers/db-cleanup.helper';
import { expectError, expectSuccess } from '../helpers/assertion.helper';
import { seedSuperAdmin, seedUploadedFile } from '../helpers/seed';

// ─── 응답 타입 ──────────────────────────────────────────────────────────────

interface RequestUploadBody {
  fileId: string;
  uploadUrl: string;
  method: string;
  headers?: Record<string, string>;
}

interface ConfirmUploadBody {
  fileId: string;
  fileUrl: string;
}

// ─── 상수 ───────────────────────────────────────────────────────────────────

const LOGIN_URL = '/api/v1/admin-auth/login';
const UPLOAD_URL_ENDPOINT = '/api/v1/admin/files/upload-url';
const CONFIRM_ENDPOINT = (fileId: string) =>
  `/api/v1/admin/files/${fileId}/confirm`;

const UPLOADS_DIR = join(process.cwd(), '.uploads');
const VALID_PASSWORD = 'P@ssw0rd!';
const ADMIN_LOGIN_ID = 'file-test-admin';

// ─── 테스트 ─────────────────────────────────────────────────────────────────

describe('파일 업로드 (File Upload) E2E', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);
  });

  afterAll(async () => {
    // .uploads 디렉토리 정리
    await fs.rm(UPLOADS_DIR, { recursive: true, force: true });
    if (app) await app.close();
  });

  beforeEach(async () => {
    await cleanDatabase(prisma);
    // .uploads 디렉토리 초기화
    await fs.rm(UPLOADS_DIR, { recursive: true, force: true });
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

  /** uploadUrl에서 storageKey를 추출하는 헬퍼 */
  function extractStorageKey(uploadUrl: string): string {
    const pathname = new URL(uploadUrl).pathname;
    // MockFileStorageAdapter가 생성하는 URL: http://localhost:{port}/dev/upload/{storageKey}
    return pathname.replace('/dev/upload/', '');
  }

  /** .uploads 디렉토리에 더미 파일을 작성하는 헬퍼 (스토리지 업로드 시뮬레이션) */
  async function writeFileToStorage(
    storageKey: string,
    content: Buffer = Buffer.from('test-file-content'),
  ): Promise<void> {
    const filePath = join(UPLOADS_DIR, storageKey);
    await fs.mkdir(dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, content);
  }

  // ─── POST /api/v1/admin/files/upload-url ─────────────────────────

  describe('POST /api/v1/admin/files/upload-url', () => {
    it('TC-FUPL-001: Presigned URL 발급 성공', async () => {
      // Given
      await seedSuperAdmin(prisma, {
        loginId: ADMIN_LOGIN_ID,
        password: VALID_PASSWORD,
      });
      const { accessToken } = await login(ADMIN_LOGIN_ID, VALID_PASSWORD);

      // When
      const response = await request(app.getHttpServer())
        .post(UPLOAD_URL_ENDPOINT)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          fileName: 'report.pdf',
          mimeType: 'application/pdf',
          fileSize: 1048576,
          purpose: 'attachment',
        });

      // Then
      const body = expectSuccess<RequestUploadBody>(response, 201);
      expect(body.fileId).toBeDefined();
      expect(body.uploadUrl).toBeDefined();
      expect(body.method).toBe('PUT');
      expect(body.headers).toBeDefined();
      expect(body.headers!['Content-Type']).toBe('application/pdf');
    });

    it('TC-FUPL-004: 인증 없이 Presigned URL 발급 요청 시 401', async () => {
      // Given: 인증 토큰 없음

      // When
      const response = await request(app.getHttpServer())
        .post(UPLOAD_URL_ENDPOINT)
        .send({
          fileName: 'report.pdf',
          mimeType: 'application/pdf',
          fileSize: 1048576,
          purpose: 'attachment',
        });

      // Then
      expectError(response, {
        statusCode: 401,
        errorCode: 'ACCESS_TOKEN_MISSING',
      });
    });

    it('TC-FUPL-005: 지원하지 않는 용도로 업로드 요청', async () => {
      // Given
      await seedSuperAdmin(prisma, {
        loginId: ADMIN_LOGIN_ID,
        password: VALID_PASSWORD,
      });
      const { accessToken } = await login(ADMIN_LOGIN_ID, VALID_PASSWORD);

      // When
      const response = await request(app.getHttpServer())
        .post(UPLOAD_URL_ENDPOINT)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          fileName: 'file.pdf',
          mimeType: 'application/pdf',
          fileSize: 1048576,
          purpose: 'invalid-purpose',
        });

      // Then
      expectError(response, {
        statusCode: 422,
        errorCode: 'UNSUPPORTED_PURPOSE',
      });
    });

    it('TC-FUPL-006: 허용되지 않은 MIME 타입으로 업로드 요청', async () => {
      // Given
      await seedSuperAdmin(prisma, {
        loginId: ADMIN_LOGIN_ID,
        password: VALID_PASSWORD,
      });
      const { accessToken } = await login(ADMIN_LOGIN_ID, VALID_PASSWORD);

      // When (profile-image 용도는 이미지만 허용)
      const response = await request(app.getHttpServer())
        .post(UPLOAD_URL_ENDPOINT)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          fileName: 'banner.exe',
          mimeType: 'application/x-msdownload',
          fileSize: 1048576,
          purpose: 'profile-image',
        });

      // Then
      expectError(response, {
        statusCode: 422,
        errorCode: 'MIME_TYPE_NOT_ALLOWED',
      });
    });

    it('TC-FUPL-007: 파일 크기 초과로 업로드 요청', async () => {
      // Given
      await seedSuperAdmin(prisma, {
        loginId: ADMIN_LOGIN_ID,
        password: VALID_PASSWORD,
      });
      const { accessToken } = await login(ADMIN_LOGIN_ID, VALID_PASSWORD);

      // When (profile-image 최대 5MB = 5,242,880 bytes)
      const response = await request(app.getHttpServer())
        .post(UPLOAD_URL_ENDPOINT)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          fileName: 'large-image.jpg',
          mimeType: 'image/jpeg',
          fileSize: 11534336,
          purpose: 'profile-image',
        });

      // Then
      expectError(response, {
        statusCode: 422,
        errorCode: 'FILE_SIZE_EXCEEDED',
      });
    });
  });

  // ─── POST /api/v1/admin/files/:fileId/confirm ───────────────────

  describe('POST /api/v1/admin/files/:fileId/confirm', () => {
    it('TC-FUPL-002: 전체 업로드 플로우 성공 (발급 → 업로드 → 확인)', async () => {
      // Given
      await seedSuperAdmin(prisma, {
        loginId: ADMIN_LOGIN_ID,
        password: VALID_PASSWORD,
      });
      const { accessToken } = await login(ADMIN_LOGIN_ID, VALID_PASSWORD);

      // When: 1. Presigned URL 발급
      const uploadUrlResponse = await request(app.getHttpServer())
        .post(UPLOAD_URL_ENDPOINT)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          fileName: 'banner.jpg',
          mimeType: 'image/jpeg',
          fileSize: 512000,
          purpose: 'profile-image',
        });
      const { fileId, uploadUrl } = expectSuccess<RequestUploadBody>(
        uploadUrlResponse,
        201,
      );

      // When: 2. 파일 업로드 (로컬 파일시스템에 직접 작성으로 시뮬레이션)
      const storageKey = extractStorageKey(uploadUrl);
      await writeFileToStorage(storageKey);

      // When: 3. 업로드 확인
      const confirmResponse = await request(app.getHttpServer())
        .post(CONFIRM_ENDPOINT(fileId))
        .set('Authorization', `Bearer ${accessToken}`);

      // Then
      const body = expectSuccess<ConfirmUploadBody>(confirmResponse, 200);
      expect(body.fileId).toBe(fileId);
      expect(body.fileUrl).toBeDefined();
      expect(body.fileUrl).toContain(storageKey);
    });

    it('TC-FUPL-003: editor-content 업로드 시 confirm 후 자동 link 처리', async () => {
      // Given
      await seedSuperAdmin(prisma, {
        loginId: ADMIN_LOGIN_ID,
        password: VALID_PASSWORD,
      });
      const { accessToken } = await login(ADMIN_LOGIN_ID, VALID_PASSWORD);

      // When: 1. Presigned URL 발급 (purpose: editor-content)
      const uploadUrlResponse = await request(app.getHttpServer())
        .post(UPLOAD_URL_ENDPOINT)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          fileName: 'editor-image.jpg',
          mimeType: 'image/jpeg',
          fileSize: 204800,
          purpose: 'editor-content',
        });
      const { fileId, uploadUrl } = expectSuccess<RequestUploadBody>(
        uploadUrlResponse,
        201,
      );

      // When: 2. 파일 업로드 시뮬레이션
      const storageKey = extractStorageKey(uploadUrl);
      await writeFileToStorage(storageKey);

      // When: 3. 업로드 확인
      const confirmResponse = await request(app.getHttpServer())
        .post(CONFIRM_ENDPOINT(fileId))
        .set('Authorization', `Bearer ${accessToken}`);

      // Then
      const body = expectSuccess<ConfirmUploadBody>(confirmResponse, 200);
      expect(body.fileId).toBe(fileId);
      expect(body.fileUrl).toBeDefined();

      // DB에서 자동 link 처리 확인
      const dbRecord = await prisma.uploadedFile.findUnique({
        where: { id: fileId },
      });
      expect(dbRecord).toBeDefined();
      expect(dbRecord!.status).toBe('CONFIRMED');
      expect(dbRecord!.linkedAt).not.toBeNull();
    });

    it('TC-FUPL-008: 존재하지 않는 파일 ID로 업로드 확인 요청', async () => {
      // Given
      await seedSuperAdmin(prisma, {
        loginId: ADMIN_LOGIN_ID,
        password: VALID_PASSWORD,
      });
      const { accessToken } = await login(ADMIN_LOGIN_ID, VALID_PASSWORD);

      // When
      const response = await request(app.getHttpServer())
        .post(CONFIRM_ENDPOINT('01NONEXISTENT000000000000'))
        .set('Authorization', `Bearer ${accessToken}`);

      // Then
      expectError(response, {
        statusCode: 404,
        errorCode: 'FILE_NOT_FOUND',
      });
    });

    it('TC-FUPL-009: 스토리지에 파일 없이 업로드 확인 요청', async () => {
      // Given
      await seedSuperAdmin(prisma, {
        loginId: ADMIN_LOGIN_ID,
        password: VALID_PASSWORD,
      });
      const { accessToken } = await login(ADMIN_LOGIN_ID, VALID_PASSWORD);

      // Presigned URL 발급만 수행 (파일 업로드 없이)
      const uploadUrlResponse = await request(app.getHttpServer())
        .post(UPLOAD_URL_ENDPOINT)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          fileName: 'report.pdf',
          mimeType: 'application/pdf',
          fileSize: 1048576,
          purpose: 'attachment',
        });
      const { fileId } = expectSuccess<RequestUploadBody>(
        uploadUrlResponse,
        201,
      );

      // When: 파일 업로드 없이 바로 확인 요청
      const response = await request(app.getHttpServer())
        .post(CONFIRM_ENDPOINT(fileId))
        .set('Authorization', `Bearer ${accessToken}`);

      // Then
      expectError(response, {
        statusCode: 422,
        errorCode: 'FILE_NOT_UPLOADED',
      });
    });

    it('TC-FUPL-010: 이미 확인된 파일을 재확인 요청', async () => {
      // Given: 전체 플로우 완료 (발급 → 업로드 → 1차 확인)
      await seedSuperAdmin(prisma, {
        loginId: ADMIN_LOGIN_ID,
        password: VALID_PASSWORD,
      });
      const { accessToken } = await login(ADMIN_LOGIN_ID, VALID_PASSWORD);

      const uploadUrlResponse = await request(app.getHttpServer())
        .post(UPLOAD_URL_ENDPOINT)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          fileName: 'banner.jpg',
          mimeType: 'image/jpeg',
          fileSize: 512000,
          purpose: 'profile-image',
        });
      const { fileId, uploadUrl } = expectSuccess<RequestUploadBody>(
        uploadUrlResponse,
        201,
      );

      const storageKey = extractStorageKey(uploadUrl);
      await writeFileToStorage(storageKey);

      // 1차 확인 성공
      await request(app.getHttpServer())
        .post(CONFIRM_ENDPOINT(fileId))
        .set('Authorization', `Bearer ${accessToken}`);

      // When: 2차 확인 시도
      const response = await request(app.getHttpServer())
        .post(CONFIRM_ENDPOINT(fileId))
        .set('Authorization', `Bearer ${accessToken}`);

      // Then
      expectError(response, {
        statusCode: 422,
        errorCode: 'FILE_ALREADY_CONFIRMED',
      });
    });

    it('TC-FUPL-011: 만료된 파일에 대해 업로드 확인 요청', async () => {
      // Given: 만료된 PENDING 파일을 DB에 직접 생성
      const admin = await seedSuperAdmin(prisma, {
        loginId: ADMIN_LOGIN_ID,
        password: VALID_PASSWORD,
      });
      const { accessToken } = await login(ADMIN_LOGIN_ID, VALID_PASSWORD);

      const expiredFile = await seedUploadedFile(prisma, {
        uploadedBy: admin.id,
        purpose: 'popup',
        mimeType: 'image/jpeg',
        originalName: 'expired.jpg',
        expiresAt: new Date(Date.now() - 60 * 60 * 1000), // 1시간 전 만료
      });

      // 스토리지에 파일이 존재하도록 작성 (스토리지 검증 통과용)
      await writeFileToStorage(expiredFile.storageKey);

      // When
      const response = await request(app.getHttpServer())
        .post(CONFIRM_ENDPOINT(expiredFile.id))
        .set('Authorization', `Bearer ${accessToken}`);

      // Then
      expectError(response, {
        statusCode: 422,
        errorCode: 'FILE_UPLOAD_EXPIRED',
      });
    });
  });
});
