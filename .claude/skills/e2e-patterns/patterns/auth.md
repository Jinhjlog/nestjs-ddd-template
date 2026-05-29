# 인증/인가 테스트 패턴

> ⚠️ 예시의 에러코드(`ACCESS_TOKEN_MISSING`/`FORBIDDEN_ADMIN_ROLE`)·역할명(`ADMIN`/`SUPER_ADMIN`)·`seedAdmin`·로그인 방식은 **그 프로젝트 것**이다. **기존 테스트·컨트롤러 조사**로 실제 값을 쓴다. 구조만 참고.

## 로그인 헬퍼 (테스트 파일 내부 정의)

```typescript
async function login(
  loginId: string,
  password: string,
): Promise<{ accessToken: string }> {
  const response = await request(app.getHttpServer())
    .post(LOGIN_URL)
    .send({ loginId, password });

  return response.body as { accessToken: string };
}
```

## 인증 없음 — 401

```typescript
it('TC-XXX-008: 인증 없이 요청 시 실패', async () => {
  // When — Authorization 헤더 없음
  const response = await request(app.getHttpServer()).get(ADMIN_URL);

  // Then
  expectError(response, {
    statusCode: 401,
    errorCode: 'ACCESS_TOKEN_MISSING',
  });
});
```

## 권한 부족 — 403

```typescript
it('TC-XXX-009: ADMIN 역할로 요청 시 실패', async () => {
  // Given — ADMIN 역할 (SUPER_ADMIN 필요한 엔드포인트)
  await seedAdmin(prisma, {
    loginId: 'normal-admin',
    password: VALID_PASSWORD,
    role: 'ADMIN',
  });
  const { accessToken } = await login('normal-admin', VALID_PASSWORD);

  // When
  const response = await request(app.getHttpServer())
    .post(ADMIN_URL)
    .set('Authorization', `Bearer ${accessToken}`)
    .send({ name: '테스트' });

  // Then
  expectError(response, {
    statusCode: 403,
    errorCode: 'FORBIDDEN_ADMIN_ROLE',
  });
});
```

## 인증 검증 원칙

- 같은 컨트롤러 내 동일 역할 제한 API는 **대표 1개만** E2E에 작성
- 나머지는 미들웨어/가드 유닛 테스트로 커버
- 401과 403은 별도 TC로 분리

## 토큰 갱신 (Refresh Token)

```typescript
it('TC-XXX-010: 토큰 갱신 성공', async () => {
  // Given
  await seedSuperAdmin(prisma, {
    loginId: ADMIN_LOGIN_ID,
    password: VALID_PASSWORD,
  });
  const loginResponse = await request(app.getHttpServer())
    .post(LOGIN_URL)
    .send({ loginId: ADMIN_LOGIN_ID, password: VALID_PASSWORD });
  const { refreshToken } = loginResponse.body;

  // When
  const response = await request(app.getHttpServer())
    .post(REFRESH_URL)
    .send({ refreshToken });

  // Then
  const body = expectSuccess<LoginResponseBody>(response, 200);
  expect(body.accessToken).toBeDefined();
  expect(body.refreshToken).toBeDefined();
  expect(body.refreshToken).not.toBe(refreshToken); // Token Rotation
});
```

## 토큰 Rotation 검증 (재사용 방지)

```typescript
it('TC-XXX-011: 사용된 리프레시 토큰 재사용 시 실패', async () => {
  // Given — 토큰 갱신 후 기존 토큰 보관
  const { refreshToken: oldToken } = await loginAndRefresh();

  // When — 기존 토큰으로 재요청
  const response = await request(app.getHttpServer())
    .post(REFRESH_URL)
    .send({ refreshToken: oldToken });

  // Then
  expectError(response, {
    statusCode: 401,
    errorCode: 'REFRESH_TOKEN_NOT_FOUND',
  });
});
```

## 소셜 로그인 (Mock OAuth)

```typescript
// 소셜 로그인 헬퍼
async function userSocialLogin(
  providerId: string,
): Promise<{ accessToken: string }> {
  const response = await request(app.getHttpServer())
    .post(SOCIAL_LOGIN_URL)
    .send({
      provider: 'GOOGLE',
      code: `id=${providerId}`,
      redirectUri: REDIRECT_URI,
    });

  return response.body as { accessToken: string };
}

it('TC-XXX-012: 기존 사용자 소셜 로그인 성공', async () => {
  // Given
  const user = await seedUser(prisma, { name: '홍길동' });
  await seedSocialAccount(prisma, {
    provider: 'GOOGLE',
    providerId: 'google_user_1',
    userId: user.id,
  });

  // When
  const response = await request(app.getHttpServer())
    .post(SOCIAL_LOGIN_URL)
    .send({
      provider: 'GOOGLE',
      code: 'id=google_user_1',
      redirectUri: REDIRECT_URI,
    });

  // Then
  const body = expectSuccess<SocialLoginExistingUserBody>(response, 200);
  expect(body.isNewUser).toBe(false);
  expect(body.accessToken).toBeDefined();
});
```
