# CRUD 테스트 패턴

> ⚠️ 예시의 `seedAdmin`·역할·검증 헬퍼·상태코드 매핑은 **그 프로젝트 것**. **기존 테스트 조사**로 실제 헬퍼/값을 쓴다. 구조만 참고.

## CREATE (POST) — 201

```typescript
it('TC-XXX-001: 리소스 등록 성공', async () => {
  // Given
  await seedSuperAdmin(prisma, {
    loginId: ADMIN_LOGIN_ID,
    password: VALID_PASSWORD,
  });
  const { accessToken } = await login(ADMIN_LOGIN_ID, VALID_PASSWORD);

  // When
  const response = await request(app.getHttpServer())
    .post(ADMIN_URL)
    .set('Authorization', `Bearer ${accessToken}`)
    .send({
      name: '새 리소스',
      description: '설명',
    });

  // Then
  const body = expectSuccess<DetailBody>(response, 201);
  expect(body).toHaveProperty('id');
  expect(body.name).toBe('새 리소스');
  expect(body).toHaveProperty('createdAt');
});
```

## READ LIST (GET) — 200

```typescript
it('TC-XXX-002: 목록 조회 성공', async () => {
  // Given
  const admin = await seedAdmin(prisma, {
    loginId: ADMIN_LOGIN_ID,
    password: VALID_PASSWORD,
    role: 'ADMIN',
  });
  await seedEntity(prisma, { name: '항목1', authorId: admin.id });
  await seedEntity(prisma, { name: '항목2', authorId: admin.id });
  const { accessToken } = await login(ADMIN_LOGIN_ID, VALID_PASSWORD);

  // When
  const response = await request(app.getHttpServer())
    .get(ADMIN_URL)
    .set('Authorization', `Bearer ${accessToken}`);

  // Then
  const body = expectSuccess<ListBody>(response, 200);
  expect(body.items).toHaveLength(2);
  expect(body.totalCount).toBe(2);
});
```

## READ DETAIL (GET /:id) — 200

```typescript
it('TC-XXX-003: 상세 조회 성공', async () => {
  // Given
  const admin = await seedSuperAdmin(prisma, {
    loginId: ADMIN_LOGIN_ID,
    password: VALID_PASSWORD,
  });
  const entity = await seedEntity(prisma, {
    name: '조회 대상',
    authorId: admin.id,
  });
  const { accessToken } = await login(ADMIN_LOGIN_ID, VALID_PASSWORD);

  // When
  const response = await request(app.getHttpServer())
    .get(`${ADMIN_URL}/${entity.id}`)
    .set('Authorization', `Bearer ${accessToken}`);

  // Then
  const body = expectSuccess<DetailBody>(response, 200);
  expect(body.id).toBe(entity.id);
  expect(body.name).toBe('조회 대상');
});
```

## UPDATE (PATCH /:id) — 200

```typescript
it('TC-XXX-004: 수정 성공', async () => {
  // Given
  const admin = await seedSuperAdmin(prisma, {
    loginId: ADMIN_LOGIN_ID,
    password: VALID_PASSWORD,
  });
  const entity = await seedEntity(prisma, {
    name: '원래 이름',
    authorId: admin.id,
  });
  const { accessToken } = await login(ADMIN_LOGIN_ID, VALID_PASSWORD);

  // When
  const response = await request(app.getHttpServer())
    .patch(`${ADMIN_URL}/${entity.id}`)
    .set('Authorization', `Bearer ${accessToken}`)
    .send({ name: '수정된 이름' });

  // Then
  const body = expectSuccess<DetailBody>(response, 200);
  expect(body.name).toBe('수정된 이름');
  // 변경하지 않은 필드는 기존값 유지 확인
  expect(body.id).toBe(entity.id);
});
```

## DELETE (DELETE /:id) — 204

```typescript
it('TC-XXX-005: 삭제 성공', async () => {
  // Given
  const admin = await seedSuperAdmin(prisma, {
    loginId: ADMIN_LOGIN_ID,
    password: VALID_PASSWORD,
  });
  const entity = await seedEntity(prisma, {
    name: '삭제 대상',
    authorId: admin.id,
  });
  const { accessToken } = await login(ADMIN_LOGIN_ID, VALID_PASSWORD);

  // When
  const response = await request(app.getHttpServer())
    .delete(`${ADMIN_URL}/${entity.id}`)
    .set('Authorization', `Bearer ${accessToken}`);

  // Then
  expect(response.status).toBe(204);

  // Soft Delete 확인: 목록에서 제외
  const listResponse = await request(app.getHttpServer())
    .get(ADMIN_URL)
    .set('Authorization', `Bearer ${accessToken}`);
  const listBody = expectSuccess<ListBody>(listResponse, 200);
  const deleted = listBody.items.find((item) => item.id === entity.id);
  expect(deleted).toBeUndefined();
});
```

## 공개 API (인증 없음)

```typescript
it('TC-XXX-006: 공개 목록 조회 성공', async () => {
  // Given
  const admin = await seedSuperAdmin(prisma, {
    loginId: ADMIN_LOGIN_ID,
    password: VALID_PASSWORD,
  });
  await seedEntity(prisma, { name: '공개 항목', authorId: admin.id });

  // When — 인증 헤더 없음
  const response = await request(app.getHttpServer()).get(PUBLIC_URL);

  // Then
  const body = expectSuccess<PublicListBody>(response, 200);
  expect(body.items).toHaveLength(1);
});
```

## 존재하지 않는 리소스 — 404

```typescript
it('TC-XXX-007: 존재하지 않는 리소스 조회 시 실패', async () => {
  // Given
  await seedSuperAdmin(prisma, {
    loginId: ADMIN_LOGIN_ID,
    password: VALID_PASSWORD,
  });
  const { accessToken } = await login(ADMIN_LOGIN_ID, VALID_PASSWORD);

  // When
  const response = await request(app.getHttpServer())
    .get(`${ADMIN_URL}/non-existent-id`)
    .set('Authorization', `Bearer ${accessToken}`);

  // Then
  expectError(response, {
    statusCode: 404,
    errorCode: 'ENTITY_NOT_FOUND',
  });
});
```
