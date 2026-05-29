import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { PrismaService } from '../../src/module/core/database/prisma.service';
import { createTestApp } from '../helpers/test-app.helper';
import { cleanDatabase } from '../helpers/db-cleanup.helper';
import { expectError, expectSuccess } from '../helpers/assertion.helper';
import { seedAdmin, seedSuperAdmin } from '../helpers/seed';

interface LoginResponseBody {
  accessToken: string;
  refreshToken: string;
}

const LOGIN_URL = '/api/v1/admin-auth/login';
const REFRESH_URL = '/api/v1/admin-auth/refresh';
const LOGOUT_URL = '/api/v1/admin-auth/logout';
const VALID_LOGIN_ID = 'admin';
const VALID_PASSWORD = 'P@ssw0rd!';

describe('관리자 인증 E2E', () => {
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

  /** 관리자 로그인 후 토큰 쌍을 반환하는 헬퍼 */
  async function login(
    loginId: string,
    password: string,
  ): Promise<LoginResponseBody> {
    const response = await request(app.getHttpServer())
      .post(LOGIN_URL)
      .send({ loginId, password });

    return response.body as LoginResponseBody;
  }

  // ─── POST /api/v1/admin-auth/login ─────────────────────────────

  describe('POST /api/v1/admin-auth/login', () => {
    it('TC-AAUTH-001: 유효한 자격증명으로 관리자 로그인 성공', async () => {
      // Given
      const admin = await seedSuperAdmin(prisma, {
        loginId: VALID_LOGIN_ID,
        password: VALID_PASSWORD,
      });

      // When
      const response = await request(app.getHttpServer())
        .post(LOGIN_URL)
        .send({ loginId: VALID_LOGIN_ID, password: VALID_PASSWORD });

      // Then
      const body = expectSuccess<LoginResponseBody>(response, 200);
      expect(body.accessToken).toBeDefined();
      expect(body.refreshToken).toBeDefined();

      const updatedAdmin = await prisma.admin.findUnique({
        where: { id: admin.id },
      });
      expect(updatedAdmin!.lastLoginAt).not.toBeNull();
    });

    it('TC-AAUTH-004: 잘못된 비밀번호로 로그인 실패', async () => {
      // Given
      await seedSuperAdmin(prisma, {
        loginId: VALID_LOGIN_ID,
        password: VALID_PASSWORD,
      });

      // When
      const response = await request(app.getHttpServer())
        .post(LOGIN_URL)
        .send({ loginId: VALID_LOGIN_ID, password: 'WrongP@ss1' });

      // Then
      expectError(response, {
        statusCode: 401,
        errorCode: 'INVALID_CREDENTIALS',
      });
    });

    it('TC-AAUTH-005: 존재하지 않는 아이디로 로그인 실패', async () => {
      // Given: nonexist 아이디의 관리자 계정이 존재하지 않음

      // When
      const response = await request(app.getHttpServer())
        .post(LOGIN_URL)
        .send({ loginId: 'nonexist', password: VALID_PASSWORD });

      // Then: 아이디 미존재와 비밀번호 불일치를 구분하지 않음
      expectError(response, {
        statusCode: 401,
        errorCode: 'INVALID_CREDENTIALS',
      });
    });

    it('TC-AAUTH-006: 비활성화된 관리자 계정으로 로그인 시도', async () => {
      // Given
      await seedAdmin(prisma, {
        loginId: 'inactive-admin',
        password: VALID_PASSWORD,
        isActive: false,
      });

      // When
      const response = await request(app.getHttpServer())
        .post(LOGIN_URL)
        .send({ loginId: 'inactive-admin', password: VALID_PASSWORD });

      // Then
      expectError(response, {
        statusCode: 403,
        errorCode: 'ADMIN_ACCOUNT_INACTIVE',
      });
    });
  });

  // ─── POST /api/v1/admin-auth/refresh ───────────────────────────

  describe('POST /api/v1/admin-auth/refresh', () => {
    it('TC-AAUTH-002: 리프레시 토큰으로 새 토큰 발급 성공', async () => {
      // Given
      await seedSuperAdmin(prisma, {
        loginId: VALID_LOGIN_ID,
        password: VALID_PASSWORD,
      });
      const loginTokens = await login(VALID_LOGIN_ID, VALID_PASSWORD);

      // When
      const response = await request(app.getHttpServer())
        .post(REFRESH_URL)
        .send({ refreshToken: loginTokens.refreshToken });

      // Then
      const body = expectSuccess<LoginResponseBody>(response, 200);
      expect(body.accessToken).toBeDefined();
      expect(body.refreshToken).toBeDefined();
      expect(body.refreshToken).not.toBe(loginTokens.refreshToken);

      // 기존 리프레시 토큰은 DB에서 삭제됨
      const oldTokenId = loginTokens.refreshToken.split(':')[0];
      const oldToken = await prisma.adminRefreshToken.findUnique({
        where: { id: oldTokenId },
      });
      expect(oldToken).toBeNull();
    });

    it('TC-AAUTH-007: 이미 사용된 리프레시 토큰으로 갱신 시도', async () => {
      // Given: 로그인 후 1회 갱신하여 기존 토큰 소멸
      await seedSuperAdmin(prisma, {
        loginId: VALID_LOGIN_ID,
        password: VALID_PASSWORD,
      });
      const loginTokens = await login(VALID_LOGIN_ID, VALID_PASSWORD);

      await request(app.getHttpServer())
        .post(REFRESH_URL)
        .send({ refreshToken: loginTokens.refreshToken });

      // When: 이미 사용된 토큰으로 재시도
      const response = await request(app.getHttpServer())
        .post(REFRESH_URL)
        .send({ refreshToken: loginTokens.refreshToken });

      // Then
      expectError(response, {
        statusCode: 401,
        errorCode: 'REFRESH_TOKEN_NOT_FOUND',
      });
    });
  });

  // ─── POST /api/v1/admin-auth/logout ────────────────────────────

  describe('POST /api/v1/admin-auth/logout', () => {
    it('TC-AAUTH-003: 로그아웃 성공', async () => {
      // Given
      await seedSuperAdmin(prisma, {
        loginId: VALID_LOGIN_ID,
        password: VALID_PASSWORD,
      });
      const loginTokens = await login(VALID_LOGIN_ID, VALID_PASSWORD);

      // When
      const response = await request(app.getHttpServer())
        .post(LOGOUT_URL)
        .send({ refreshToken: loginTokens.refreshToken });

      // Then
      expect(response.status).toBe(204);

      // 로그아웃 후 해당 토큰으로 갱신 시도 시 실패
      const refreshResponse = await request(app.getHttpServer())
        .post(REFRESH_URL)
        .send({ refreshToken: loginTokens.refreshToken });

      expectError(refreshResponse, {
        statusCode: 401,
        errorCode: 'REFRESH_TOKEN_NOT_FOUND',
      });
    });
  });
});
