import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { PrismaService } from '../../src/module/core/database/prisma.service';
import { createTestApp } from '../helpers/test-app.helper';
import { cleanDatabase } from '../helpers/db-cleanup.helper';
import { expectError, expectSuccess } from '../helpers/assertion.helper';
import { seedUser } from '../helpers/seed';

interface TokenResponseBody {
  accessToken: string;
  refreshToken: string;
}

const REGISTER_URL = '/api/v1/user-auth/register';
const LOGIN_URL = '/api/v1/user-auth/login';
const REFRESH_URL = '/api/v1/user-auth/refresh';
const LOGOUT_URL = '/api/v1/user-auth/logout';

const TEST_EMAIL = 'test@example.com';
const TEST_PASSWORD = 'Test1234!';

describe('사용자 인증 E2E', () => {
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

  /** 사용자 로그인 후 토큰 쌍을 반환하는 헬퍼 */
  async function login(
    email: string,
    password: string,
  ): Promise<TokenResponseBody> {
    const response = await request(app.getHttpServer())
      .post(LOGIN_URL)
      .send({ email, password });

    return response.body as TokenResponseBody;
  }

  // ─── POST /api/v1/user-auth/register ──────────────────────────────

  describe('POST /api/v1/user-auth/register', () => {
    it('TC-UAUTH-001: 유효한 정보로 회원가입 성공', async () => {
      // Given: 가입된 사용자가 없음

      // When
      const response = await request(app.getHttpServer())
        .post(REGISTER_URL)
        .send({
          email: TEST_EMAIL,
          password: TEST_PASSWORD,
          name: '홍길동',
          phone: '01012345678',
        });

      // Then
      const body = expectSuccess<TokenResponseBody>(response, 200);
      expect(body.accessToken).toBeDefined();
      expect(body.refreshToken).toBeDefined();

      // 발급된 토큰으로 보호된 API 호출 가능 확인
      const profileResponse = await request(app.getHttpServer())
        .get('/api/v1/users/me')
        .set('Authorization', `Bearer ${body.accessToken}`);
      expect(profileResponse.status).toBe(200);
    });

    it('TC-UAUTH-002: 중복 이메일로 회원가입 실패', async () => {
      // Given
      await seedUser(prisma, { email: TEST_EMAIL, password: TEST_PASSWORD });

      // When
      const response = await request(app.getHttpServer())
        .post(REGISTER_URL)
        .send({
          email: TEST_EMAIL,
          password: TEST_PASSWORD,
          name: '다른이름',
        });

      // Then
      expectError(response, {
        statusCode: 409,
        errorCode: 'EMAIL_ALREADY_EXISTS',
      });
    });
  });

  // ─── POST /api/v1/user-auth/login ─────────────────────────────────

  describe('POST /api/v1/user-auth/login', () => {
    it('TC-UAUTH-003: 유효한 자격증명으로 로그인 성공', async () => {
      // Given
      await seedUser(prisma, { email: TEST_EMAIL, password: TEST_PASSWORD });

      // When
      const response = await request(app.getHttpServer())
        .post(LOGIN_URL)
        .send({ email: TEST_EMAIL, password: TEST_PASSWORD });

      // Then
      const body = expectSuccess<TokenResponseBody>(response, 200);
      expect(body.accessToken).toBeDefined();
      expect(body.refreshToken).toBeDefined();
    });

    it('TC-UAUTH-004: 잘못된 비밀번호로 로그인 실패', async () => {
      // Given
      await seedUser(prisma, { email: TEST_EMAIL, password: TEST_PASSWORD });

      // When
      const response = await request(app.getHttpServer())
        .post(LOGIN_URL)
        .send({ email: TEST_EMAIL, password: 'WrongP@ss1!' });

      // Then
      expectError(response, {
        statusCode: 401,
        errorCode: 'INVALID_CREDENTIALS',
      });
    });

    it('TC-UAUTH-005: 존재하지 않는 이메일로 로그인 실패', async () => {
      // Given: 해당 이메일의 사용자가 없음

      // When
      const response = await request(app.getHttpServer())
        .post(LOGIN_URL)
        .send({ email: 'nonexist@example.com', password: TEST_PASSWORD });

      // Then: 이메일 미존재와 비밀번호 불일치를 구분하지 않음
      expectError(response, {
        statusCode: 401,
        errorCode: 'INVALID_CREDENTIALS',
      });
    });

    it('TC-UAUTH-006: 비활성화된 계정으로 로그인 시도', async () => {
      // Given
      await seedUser(prisma, {
        email: TEST_EMAIL,
        password: TEST_PASSWORD,
        isActive: false,
      });

      // When
      const response = await request(app.getHttpServer())
        .post(LOGIN_URL)
        .send({ email: TEST_EMAIL, password: TEST_PASSWORD });

      // Then
      expectError(response, {
        statusCode: 403,
        errorCode: 'USER_ACCOUNT_INACTIVE',
      });
    });
  });

  // ─── POST /api/v1/user-auth/refresh ───────────────────────────────

  describe('POST /api/v1/user-auth/refresh', () => {
    it('TC-UAUTH-007: 리프레시 토큰으로 새 토큰 발급 성공', async () => {
      // Given
      await seedUser(prisma, { email: TEST_EMAIL, password: TEST_PASSWORD });
      const loginTokens = await login(TEST_EMAIL, TEST_PASSWORD);

      // When
      const response = await request(app.getHttpServer())
        .post(REFRESH_URL)
        .send({ refreshToken: loginTokens.refreshToken });

      // Then
      const body = expectSuccess<TokenResponseBody>(response, 200);
      expect(body.accessToken).toBeDefined();
      expect(body.refreshToken).toBeDefined();
      expect(body.refreshToken).not.toBe(loginTokens.refreshToken);

      // 기존 리프레시 토큰은 DB에서 삭제됨 (일회용 rotation)
      const oldTokenId = loginTokens.refreshToken.split(':')[0];
      const oldToken = await prisma.refreshToken.findUnique({
        where: { id: oldTokenId },
      });
      expect(oldToken).toBeNull();
    });

    it('TC-UAUTH-008: 이미 사용된 리프레시 토큰으로 갱신 시도', async () => {
      // Given: 로그인 후 1회 갱신하여 기존 토큰 소멸
      await seedUser(prisma, { email: TEST_EMAIL, password: TEST_PASSWORD });
      const loginTokens = await login(TEST_EMAIL, TEST_PASSWORD);

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

  // ─── POST /api/v1/user-auth/logout ────────────────────────────────

  describe('POST /api/v1/user-auth/logout', () => {
    it('TC-UAUTH-009: 로그아웃 성공', async () => {
      // Given
      await seedUser(prisma, { email: TEST_EMAIL, password: TEST_PASSWORD });
      const loginTokens = await login(TEST_EMAIL, TEST_PASSWORD);

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
