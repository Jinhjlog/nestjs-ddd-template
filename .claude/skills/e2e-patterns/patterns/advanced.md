# 고급 테스트 패턴

> ⚠️ 예시의 페이지네이션 필드(`totalPages` 등)는 오프셋 기준. **방식(커서/오프셋)은 응답 DTO 조사**로 맞춘다. 에러코드·역할도 조사.

## 0. 소유권 / 조직 격리 = 404

다른 사용자/조직의 리소스 접근은 **존재 정보를 숨기기 위해 403이 아니라 404**로 검증한다(rules/e2e 합의). 예: 본인 소유 아닌 리소스 수정/삭제/상세.

```typescript
it('TC-XXX-0NN: 소유권 없는 리소스 접근 → 404', async () => {
  // Given: 다른 사용자가 만든 리소스
  // When: 내 토큰으로 PATCH/DELETE/GET
  // Then:
  expectError(response, { statusCode: 404, errorCode: 'XXX_NOT_FOUND' });
});
```

## 1-B. 커서 페이지네이션 검증 (프로젝트가 커서 방식일 때)

응답이 `{ items, nextCursor, hasNext }`이면 오프셋(`totalPages`)이 아니라 커서로 검증한다:

```typescript
const body = expectSuccess<XxxListBody>(res, 200); // { items, nextCursor, hasNext }
expect(body.items).toHaveLength(limit);
expect(body.hasNext).toBe(true);
expect(body.nextCursor).toBeTruthy();
// 다음 페이지: ?cursor=<nextCursor> 로 재요청해 이어지는지 확인
```

## 1. 페이지네이션

```typescript
it('TC-XXX-001: 페이지네이션 동작 확인', async () => {
  // Given — 3개 데이터
  const admin = await seedSuperAdmin(prisma, {
    loginId: ADMIN_LOGIN_ID,
    password: VALID_PASSWORD,
  });
  await seedEntity(prisma, { name: '항목1', authorId: admin.id });
  await seedEntity(prisma, { name: '항목2', authorId: admin.id });
  await seedEntity(prisma, { name: '항목3', authorId: admin.id });
  const { accessToken } = await login(ADMIN_LOGIN_ID, VALID_PASSWORD);

  // When — 1페이지, limit 2
  const firstResponse = await request(app.getHttpServer())
    .get(ADMIN_URL)
    .query({ limit: 2, page: 1 })
    .set('Authorization', `Bearer ${accessToken}`);

  // Then
  const firstBody = expectSuccess<ListBody>(firstResponse, 200);
  expect(firstBody.items).toHaveLength(2);
  expect(firstBody.totalCount).toBe(3);
  expect(firstBody.totalPages).toBe(2);
  expect(firstBody.currentPage).toBe(1);

  // When — 2페이지
  const secondResponse = await request(app.getHttpServer())
    .get(ADMIN_URL)
    .query({ limit: 2, page: 2 })
    .set('Authorization', `Bearer ${accessToken}`);

  const secondBody = expectSuccess<ListBody>(secondResponse, 200);
  expect(secondBody.items).toHaveLength(1);
  expect(secondBody.currentPage).toBe(2);

  // 페이지 간 데이터 중복 없음 확인
  const firstPageIds = firstBody.items.map((m) => m.id);
  secondBody.items.forEach((m) => {
    expect(firstPageIds).not.toContain(m.id);
  });
});
```

## 2. 키워드 검색

```typescript
it('TC-XXX-002: 키워드 검색 성공', async () => {
  // Given
  const admin = await seedSuperAdmin(prisma, {
    loginId: ADMIN_LOGIN_ID,
    password: VALID_PASSWORD,
  });
  await seedEntity(prisma, { title: '취업 박람회 안내', authorId: admin.id });
  await seedEntity(prisma, { title: '시설 이용 안내', authorId: admin.id });

  // When
  const response = await request(app.getHttpServer())
    .get(PUBLIC_URL)
    .query({ keyword: '취업' });

  // Then
  const body = expectSuccess<ListBody>(response, 200);
  expect(body.items).toHaveLength(1);
  expect(body.items[0].title).toContain('취업');
});
```

## 3. 필터링

```typescript
it('TC-XXX-003: 카테고리 필터링 성공', async () => {
  // Given
  const admin = await seedSuperAdmin(prisma, {
    loginId: ADMIN_LOGIN_ID,
    password: VALID_PASSWORD,
  });
  const catA = await seedCategory(prisma, { name: '카테고리A' });
  const catB = await seedCategory(prisma, { name: '카테고리B' });
  await seedEntity(prisma, {
    title: 'A 소속',
    categoryId: catA.id,
    authorId: admin.id,
  });
  await seedEntity(prisma, {
    title: 'B 소속',
    categoryId: catB.id,
    authorId: admin.id,
  });

  // When
  const response = await request(app.getHttpServer())
    .get(PUBLIC_URL)
    .query({ categoryId: catA.id });

  // Then
  const body = expectSuccess<ListBody>(response, 200);
  expect(body.items).toHaveLength(1);
  expect(body.items[0].title).toBe('A 소속');
});
```

## 4. 상태 전이

```typescript
// 승인 (PENDING → APPROVED)
it('TC-XXX-004: 승인 처리 성공', async () => {
  // Given
  await seedSuperAdmin(prisma, {
    loginId: ADMIN_LOGIN_ID,
    password: VALID_PASSWORD,
  });
  const entity = await seedEntity(prisma, {
    title: '승인 대기',
    approvalStatus: 'PENDING',
  });
  const { accessToken } = await login(ADMIN_LOGIN_ID, VALID_PASSWORD);

  // When
  const response = await request(app.getHttpServer())
    .patch(`${ADMIN_URL}/${entity.id}/approve`)
    .set('Authorization', `Bearer ${accessToken}`);

  // Then
  expect(response.status).toBe(200);

  // 상태 변경 확인
  const detailResponse = await request(app.getHttpServer())
    .get(`${ADMIN_URL}/${entity.id}`)
    .set('Authorization', `Bearer ${accessToken}`);
  const body = expectSuccess<DetailBody>(detailResponse, 200);
  expect(body.approvalStatus).toBe('APPROVED');
});

// 반려 (PENDING → REJECTED)
it('TC-XXX-005: 반려 처리 성공', async () => {
  // Given
  await seedSuperAdmin(prisma, {
    loginId: ADMIN_LOGIN_ID,
    password: VALID_PASSWORD,
  });
  const entity = await seedEntity(prisma, {
    title: '반려 대상',
    approvalStatus: 'PENDING',
  });
  const { accessToken } = await login(ADMIN_LOGIN_ID, VALID_PASSWORD);

  // When
  const response = await request(app.getHttpServer())
    .patch(`${ADMIN_URL}/${entity.id}/reject`)
    .set('Authorization', `Bearer ${accessToken}`)
    .send({ rejectionReason: '내용이 부적절합니다.' });

  // Then
  expect(response.status).toBe(200);
  const detailResponse = await request(app.getHttpServer())
    .get(`${ADMIN_URL}/${entity.id}`)
    .set('Authorization', `Bearer ${accessToken}`);
  const body = expectSuccess<DetailBody>(detailResponse, 200);
  expect(body.approvalStatus).toBe('REJECTED');
  expect(body.rejectionReason).toBe('내용이 부적절합니다.');
});

// 유효하지 않은 상태 전이
it('TC-XXX-006: 이미 승인된 항목 재승인 시 실패', async () => {
  // Given
  await seedSuperAdmin(prisma, {
    loginId: ADMIN_LOGIN_ID,
    password: VALID_PASSWORD,
  });
  const entity = await seedEntity(prisma, {
    title: '이미 승인됨',
    approvalStatus: 'APPROVED',
  });
  const { accessToken } = await login(ADMIN_LOGIN_ID, VALID_PASSWORD);

  // When
  const response = await request(app.getHttpServer())
    .patch(`${ADMIN_URL}/${entity.id}/approve`)
    .set('Authorization', `Bearer ${accessToken}`);

  // Then
  expectError(response, {
    statusCode: 400,
    errorCode: 'INVALID_APPROVAL_STATUS_TRANSITION',
  });
});

// 수정 시 상태 리셋
it('TC-XXX-007: 승인된 글 수정 시 PENDING 재설정', async () => {
  // Given
  const user = await seedUser(prisma, { name: '홍길동' });
  await seedSocialAccount(prisma, {
    provider: 'GOOGLE',
    providerId: 'user_1',
    userId: user.id,
  });
  const entity = await seedEntity(prisma, {
    title: '원래 제목',
    approvalStatus: 'APPROVED',
    authorId: user.id,
  });
  const { accessToken } = await userSocialLogin('user_1');

  // When
  const response = await request(app.getHttpServer())
    .patch(`${MY_URL}/${entity.id}`)
    .set('Authorization', `Bearer ${accessToken}`)
    .send({ title: '수정된 제목' });

  // Then
  const body = expectSuccess<DetailBody>(response, 200);
  expect(body.title).toBe('수정된 제목');
  expect(body.approvalStatus).toBe('PENDING');
});
```

## 5. 기간 검증

```typescript
// 기간 역순 검증 (startAt > endAt)
it('TC-XXX-008: 종료일이 시작일보다 이전이면 실패', async () => {
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
      title: '기간 검증 테스트',
      startAt: '2026-05-01T00:00:00.000Z',
      endAt: '2026-04-01T00:00:00.000Z',
    });

  // Then
  expectError(response, {
    statusCode: 400,
    errorCode: 'INVALID_DATE_RANGE',
  });
});

// 기간 겹침 검증
it('TC-XXX-009: 기간이 겹치는 항목 등록 시 실패', async () => {
  // Given — 기존 항목: 4/1 ~ 5/1
  await seedSuperAdmin(prisma, {
    loginId: ADMIN_LOGIN_ID,
    password: VALID_PASSWORD,
  });
  await seedEntity(prisma, {
    title: '기존 항목',
    startAt: new Date('2026-04-01T00:00:00.000Z'),
    endAt: new Date('2026-05-01T00:00:00.000Z'),
  });
  const { accessToken } = await login(ADMIN_LOGIN_ID, VALID_PASSWORD);

  // When — 겹치는 기간: 4/15 ~ 5/15
  const response = await request(app.getHttpServer())
    .post(ADMIN_URL)
    .set('Authorization', `Bearer ${accessToken}`)
    .send({
      title: '겹치는 항목',
      startAt: '2026-04-15T00:00:00.000Z',
      endAt: '2026-05-15T00:00:00.000Z',
    });

  // Then
  expectError(response, {
    statusCode: 400,
    errorCode: 'PERIOD_OVERLAP',
  });
});

// 활성 기간 내 항목만 공개 조회
it('TC-XXX-010: 현재 활성 항목만 공개 조회에 포함', async () => {
  // Given
  const now = new Date();
  const pastDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const futureDate = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  await seedEntity(prisma, {
    title: '활성 항목',
    startAt: pastDate,
    endAt: futureDate,
    isActive: true,
  });
  await seedEntity(prisma, {
    title: '만료 항목',
    startAt: new Date(now.getTime() - 48 * 60 * 60 * 1000),
    endAt: pastDate,
    isActive: true,
  });

  // When
  const response = await request(app.getHttpServer()).get(PUBLIC_URL);

  // Then
  const body = expectSuccess<ListBody>(response, 200);
  expect(body.items).toHaveLength(1);
  expect(body.items[0].title).toBe('활성 항목');
});
```

## 6. 파일 첨부

```typescript
// CONFIRMED 파일 첨부 성공
it('TC-XXX-011: 파일 첨부하여 등록 성공', async () => {
  // Given
  const admin = await seedSuperAdmin(prisma, {
    loginId: ADMIN_LOGIN_ID,
    password: VALID_PASSWORD,
  });
  const file1 = await seedUploadedFile(prisma, {
    uploadedBy: admin.id,
    purpose: 'notice',
    status: 'CONFIRMED',
    confirmedAt: new Date(),
  });
  const file2 = await seedUploadedFile(prisma, {
    uploadedBy: admin.id,
    purpose: 'notice',
    status: 'CONFIRMED',
    confirmedAt: new Date(),
  });
  const { accessToken } = await login(ADMIN_LOGIN_ID, VALID_PASSWORD);

  // When
  const response = await request(app.getHttpServer())
    .post(ADMIN_URL)
    .set('Authorization', `Bearer ${accessToken}`)
    .send({
      title: '파일 포함',
      content: '<p>내용</p>',
      fileIds: [file1.id, file2.id],
    });

  // Then
  const body = expectSuccess<DetailBody>(response, 201);
  expect(body.files).toHaveLength(2);
  expect(body.files[0].sortOrder).toBe(0);
  expect(body.files[1].sortOrder).toBe(1);
});

// CONFIRMED 아닌 파일 첨부 시 실패
it('TC-XXX-012: PENDING 상태 파일 첨부 시 실패', async () => {
  // Given
  const admin = await seedSuperAdmin(prisma, {
    loginId: ADMIN_LOGIN_ID,
    password: VALID_PASSWORD,
  });
  const pendingFile = await seedUploadedFile(prisma, {
    uploadedBy: admin.id,
    purpose: 'notice',
    status: 'PENDING',
  });
  const { accessToken } = await login(ADMIN_LOGIN_ID, VALID_PASSWORD);

  // When
  const response = await request(app.getHttpServer())
    .post(ADMIN_URL)
    .set('Authorization', `Bearer ${accessToken}`)
    .send({
      title: '파일 포함',
      content: '<p>내용</p>',
      fileIds: [pendingFile.id],
    });

  // Then
  expectError(response, {
    statusCode: 400,
    errorCode: 'FILE_NOT_CONFIRMED',
  });
});

// 파일 추가/제거 (PATCH)
it('TC-XXX-013: 파일 추가 및 제거 성공', async () => {
  // Given — 기존 파일 1개 첨부된 상태
  // ... 기존 엔티티 + 기존 파일 seed
  const newFile = await seedUploadedFile(prisma, {
    uploadedBy: admin.id,
    purpose: 'notice',
    status: 'CONFIRMED',
    confirmedAt: new Date(),
  });
  const { accessToken } = await login(ADMIN_LOGIN_ID, VALID_PASSWORD);

  // When
  const response = await request(app.getHttpServer())
    .patch(`${ADMIN_URL}/${entity.id}`)
    .set('Authorization', `Bearer ${accessToken}`)
    .send({
      addFileIds: [newFile.id],
      removeFileIds: [existingFile.id],
    });

  // Then
  const body = expectSuccess<DetailBody>(response, 200);
  expect(body.files).toHaveLength(1);
  expect(body.files[0].id).not.toBe(existingFile.id);
});
```

## 7. sortOrder 자동 관리

```typescript
// 자동 부여
it('TC-XXX-014: sortOrder 미지정 시 자동 부여', async () => {
  // Given
  await seedSuperAdmin(prisma, {
    loginId: ADMIN_LOGIN_ID,
    password: VALID_PASSWORD,
  });
  const { accessToken } = await login(ADMIN_LOGIN_ID, VALID_PASSWORD);

  // When — 2개 순차 등록
  const resA = await request(app.getHttpServer())
    .post(ADMIN_URL)
    .set('Authorization', `Bearer ${accessToken}`)
    .send({ title: '항목A' });
  const resB = await request(app.getHttpServer())
    .post(ADMIN_URL)
    .set('Authorization', `Bearer ${accessToken}`)
    .send({ title: '항목B' });

  // Then — 순서대로 부여
  const bodyA = expectSuccess<DetailBody>(resA, 201);
  const bodyB = expectSuccess<DetailBody>(resB, 201);
  expect(bodyA.sortOrder).toBe(1);
  expect(bodyB.sortOrder).toBe(2);
});

// 삭제 후 재정렬
it('TC-XXX-015: 삭제 후 나머지 항목 sortOrder 재정렬', async () => {
  // Given — 3개 항목 (sortOrder 1, 2, 3)
  // ... seed 3개
  const { accessToken } = await login(ADMIN_LOGIN_ID, VALID_PASSWORD);

  // When — 중간 항목(sortOrder 2) 삭제
  await request(app.getHttpServer())
    .delete(`${ADMIN_URL}/${middleItem.id}`)
    .set('Authorization', `Bearer ${accessToken}`);

  // Then — 나머지 재정렬 (1, 2)
  const listResponse = await request(app.getHttpServer())
    .get(ADMIN_URL)
    .set('Authorization', `Bearer ${accessToken}`);
  const body = expectSuccess<ListBody>(listResponse, 200);
  const sortOrders = body.items.map((i) => i.sortOrder).sort();
  expect(sortOrders).toEqual([1, 2]);
});
```

## 8. 최대 개수 제한

```typescript
it('TC-XXX-016: 최대 개수 초과 시 등록 실패', async () => {
  // Given — 최대 개수만큼 seed
  await seedSuperAdmin(prisma, {
    loginId: ADMIN_LOGIN_ID,
    password: VALID_PASSWORD,
  });
  for (let i = 1; i <= 20; i++) {
    await seedEntity(prisma, { title: `항목 ${i}`, sortOrder: i });
  }
  const { accessToken } = await login(ADMIN_LOGIN_ID, VALID_PASSWORD);

  // When — 21번째 등록 시도
  const response = await request(app.getHttpServer())
    .post(ADMIN_URL)
    .set('Authorization', `Bearer ${accessToken}`)
    .send({ title: '초과 항목' });

  // Then
  expectError(response, {
    statusCode: 400,
    errorCode: 'MAX_LIMIT_EXCEEDED',
  });
});
```

## 9. 디폴트 항목 교체

```typescript
it('TC-XXX-017: 디폴트 지정 시 기존 디폴트 해제', async () => {
  // Given
  await seedSuperAdmin(prisma, {
    loginId: ADMIN_LOGIN_ID,
    password: VALID_PASSWORD,
  });
  const oldDefault = await seedEntity(prisma, {
    title: '기존 디폴트',
    isDefault: true,
  });
  const newItem = await seedEntity(prisma, {
    title: '새 디폴트 후보',
    isDefault: false,
  });
  const { accessToken } = await login(ADMIN_LOGIN_ID, VALID_PASSWORD);

  // When
  const response = await request(app.getHttpServer())
    .patch(`${ADMIN_URL}/${newItem.id}/default`)
    .set('Authorization', `Bearer ${accessToken}`);

  // Then — 새 항목이 디폴트
  const body = expectSuccess<DetailBody>(response, 200);
  expect(body.isDefault).toBe(true);

  // 기존 디폴트 해제 확인
  const oldResponse = await request(app.getHttpServer())
    .get(`${ADMIN_URL}/${oldDefault.id}`)
    .set('Authorization', `Bearer ${accessToken}`);
  const oldBody = expectSuccess<DetailBody>(oldResponse, 200);
  expect(oldBody.isDefault).toBe(false);
});
```

## 10. 의존성 삭제 제약

```typescript
it('TC-XXX-018: 소속 항목이 있는 리소스 삭제 시 실패', async () => {
  // Given
  await seedSuperAdmin(prisma, {
    loginId: ADMIN_LOGIN_ID,
    password: VALID_PASSWORD,
  });
  const parent = await seedParent(prisma, { name: '부모 리소스' });
  await seedChild(prisma, { parentId: parent.id, name: '자식 리소스' });
  const { accessToken } = await login(ADMIN_LOGIN_ID, VALID_PASSWORD);

  // When
  const response = await request(app.getHttpServer())
    .delete(`${ADMIN_URL}/${parent.id}`)
    .set('Authorization', `Bearer ${accessToken}`);

  // Then
  expectError(response, {
    statusCode: 400,
    errorCode: 'RESOURCE_HAS_CHILDREN',
  });
});
```

## 11. DB 부수효과 검증

API 응답으로 확인 불가 + 비즈니스 핵심일 때만 사용:

```typescript
it('TC-XXX-019: 파일 confirm 후 DB 상태 확인', async () => {
  // Given & When
  // ... API 호출

  // Then — DB 직접 검증
  const dbRecord = await prisma.uploadedFile.findUnique({
    where: { id: fileId },
  });
  expect(dbRecord).toBeDefined();
  expect(dbRecord!.status).toBe('CONFIRMED');
  expect(dbRecord!.linkedAt).not.toBeNull();
});
```

## 12. 중복 검증 — 409

```typescript
it('TC-XXX-020: 이름 중복 등록 시 실패', async () => {
  // Given
  await seedSuperAdmin(prisma, {
    loginId: ADMIN_LOGIN_ID,
    password: VALID_PASSWORD,
  });
  await seedEntity(prisma, { name: '기존 이름' });
  const { accessToken } = await login(ADMIN_LOGIN_ID, VALID_PASSWORD);

  // When
  const response = await request(app.getHttpServer())
    .post(ADMIN_URL)
    .set('Authorization', `Bearer ${accessToken}`)
    .send({ name: '기존 이름' });

  // Then
  expectError(response, {
    statusCode: 409,
    errorCode: 'NAME_ALREADY_EXISTS',
  });
});
```

## 13. 공개 vs 관리자 응답 필드 차이

```typescript
it('TC-XXX-021: 공개 API는 내부 필드를 포함하지 않음', async () => {
  // Given
  // ... seed

  // When
  const response = await request(app.getHttpServer()).get(PUBLIC_URL);

  // Then
  const body = expectSuccess<PublicListBody>(response, 200);
  const item = body.items[0];

  // 공개 필드 포함
  expect(item).toHaveProperty('name');
  expect(item).toHaveProperty('title');

  // 내부 필드 미포함
  expect(item).not.toHaveProperty('isActive');
  expect(item).not.toHaveProperty('createdAt');
  expect(item).not.toHaveProperty('updatedAt');
});
```
