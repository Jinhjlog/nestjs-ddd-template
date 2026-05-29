/**
 * 시나리오: 사용자 인증 전체 주기
 *
 * 배우:      User (회원가입으로 생성)
 * 전제:      없음 (Step 1의 회원가입이 사용자를 만든다)
 * 성공 조건: 회원가입 → 보호 API 호출 → 토큰 갱신(rotation) → 갱신 토큰 재사용 → 로그아웃 → 무효화
 *
 * Step 1   회원가입 → 토큰 발급
 * Step 2   발급된 accessToken으로 본인 프로필 조회
 * Step 3   refreshToken으로 토큰 갱신 (Rotation: 새 refreshToken ≠ 기존)
 * Step 4   갱신된 accessToken으로 다시 보호 API 호출
 * Step 5   소진된(이전) refreshToken 재사용 → 실패
 * Step 6   갱신된 refreshToken으로 로그아웃
 * Step 7   로그아웃된 refreshToken으로 갱신 시도 → 실패
 *
 * Contract Test(`test/e2e/*.e2e-spec.ts`)가 엔드포인트를 독립적으로(매 TC DB 클린) 검증한다면,
 * Scenario Test는 실제 사용자 여정을 따라 여러 API를 체인으로 잇고 이전 스텝의 결과를 다음 스텝에서 쓴다.
 * → DB는 beforeAll에서 1회만 클린하고, 공유 상태는 외부 변수로 스텝 간에 전달한다.
 *
 * 실행: npm run test:scenarios
 */

import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { PrismaService } from '../../src/module/core/database/prisma.service';
import { createTestApp } from '../helpers/test-app.helper';
import { cleanDatabase } from '../helpers/db-cleanup.helper';
import { expectError, expectSuccess } from '../helpers/assertion.helper';

interface TokenResponseBody {
  accessToken: string;
  refreshToken: string;
}

interface MyProfileBody {
  id: string;
  email: string | null;
  name: string | null;
  phone: string | null;
  isActive: boolean;
  createdAt: string;
}

const REGISTER_URL = '/api/v1/user-auth/register';
const REFRESH_URL = '/api/v1/user-auth/refresh';
const LOGOUT_URL = '/api/v1/user-auth/logout';
const ME_URL = '/api/v1/users/me';

const TEST_EMAIL = 'journey@example.com';
const TEST_PASSWORD = 'Test1234!';

describe('시나리오: 사용자 인증 전체 주기', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;

  // 공유 상태 (스텝 간 전달)
  let registered: TokenResponseBody;
  let refreshed: TokenResponseBody;
  let userId: string;

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);
    // 시나리오는 스텝 간 상태를 이어가므로 시작 시 1회만 클린한다.
    await cleanDatabase(prisma);
  });

  afterAll(async () => {
    if (app) await app.close();
  });

  // ── Step 1 ──

  it('Step 1: 회원가입 → 토큰 발급', async () => {
    const res = await request(app.getHttpServer()).post(REGISTER_URL).send({
      email: TEST_EMAIL,
      password: TEST_PASSWORD,
      name: '홍길동',
      phone: '01012345678',
    });

    registered = expectSuccess<TokenResponseBody>(res, 200);
    expect(registered.accessToken).toBeDefined();
    expect(registered.refreshToken).toBeDefined();
  });

  // ── Step 2 ──

  it('Step 2: 발급된 accessToken으로 본인 프로필 조회', async () => {
    const res = await request(app.getHttpServer())
      .get(ME_URL)
      .set('Authorization', `Bearer ${registered.accessToken}`);

    const me = expectSuccess<MyProfileBody>(res, 200);
    expect(me.email).toBe(TEST_EMAIL);
    expect(me.name).toBe('홍길동');

    userId = me.id;
  });

  // ── Step 3 ──

  it('Step 3: refreshToken으로 토큰 갱신 (Rotation)', async () => {
    const res = await request(app.getHttpServer())
      .post(REFRESH_URL)
      .send({ refreshToken: registered.refreshToken });

    refreshed = expectSuccess<TokenResponseBody>(res, 200);
    expect(refreshed.accessToken).toBeDefined();
    // Rotation: 새 refreshToken은 기존과 달라야 한다
    expect(refreshed.refreshToken).not.toBe(registered.refreshToken);
  });

  // ── Step 4 ──

  it('Step 4: 갱신된 accessToken으로 다시 보호 API 호출', async () => {
    const res = await request(app.getHttpServer())
      .get(ME_URL)
      .set('Authorization', `Bearer ${refreshed.accessToken}`);

    const me = expectSuccess<MyProfileBody>(res, 200);
    expect(me.id).toBe(userId); // 동일 사용자
  });

  // ── Step 5 ──

  it('Step 5: 소진된(이전) refreshToken 재사용 → 실패', async () => {
    const res = await request(app.getHttpServer())
      .post(REFRESH_URL)
      .send({ refreshToken: registered.refreshToken });

    expectError(res, {
      statusCode: 401,
      errorCode: 'REFRESH_TOKEN_NOT_FOUND',
    });
  });

  // ── Step 6 ──

  it('Step 6: 갱신된 refreshToken으로 로그아웃', async () => {
    const res = await request(app.getHttpServer())
      .post(LOGOUT_URL)
      .send({ refreshToken: refreshed.refreshToken });

    expect(res.status).toBe(204);
  });

  // ── Step 7 ──

  it('Step 7: 로그아웃된 refreshToken으로 갱신 시도 → 실패', async () => {
    const res = await request(app.getHttpServer())
      .post(REFRESH_URL)
      .send({ refreshToken: refreshed.refreshToken });

    expectError(res, {
      statusCode: 401,
      errorCode: 'REFRESH_TOKEN_NOT_FOUND',
    });
  });
});
