import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { createTestApp } from '../helpers/test-app.helper';

describe('E2E 테스트 환경 검증', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    if (app) await app.close();
  });

  it('앱이 정상적으로 시작된다', () => {
    expect(app).toBeDefined();
  });

  it('존재하지 않는 경로에 대해 404를 반환한다', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/v1/non-existent')
      .expect(404);

    expect(response.body).toHaveProperty('statusCode', 404);
  });
});
