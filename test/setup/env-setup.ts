import * as fs from 'fs';
import * as path from 'path';
import type { TestDbConfig } from '../types/global';

const CONFIG_PATH = path.join(__dirname, '..', '.test-db-config.json');

// globalSetup에서 저장한 DB 연결 정보를 읽어 process.env에 설정
const config = JSON.parse(
  fs.readFileSync(CONFIG_PATH, 'utf-8'),
) as TestDbConfig;

process.env.NODE_ENV = 'test';

// DB (Testcontainers가 동적 주입)
process.env.DB_HOST = config.host;
process.env.DB_PORT = String(config.port);
process.env.DB_USER = config.username;
process.env.DB_PASSWORD = config.password;
process.env.DB_NAME = config.database;
process.env.DATABASE_URL = config.databaseUrl;

// JWT (사용자)
process.env.JWT_ACCESS_SECRET =
  process.env.JWT_ACCESS_SECRET || 'test-jwt-access-secret-for-e2e';
process.env.JWT_ACCESS_TOKEN_EXPIRES_IN =
  process.env.JWT_ACCESS_TOKEN_EXPIRES_IN || '3600';

// JWT (관리자)
process.env.ADMIN_JWT_ACCESS_SECRET =
  process.env.ADMIN_JWT_ACCESS_SECRET || 'test-admin-jwt-access-secret-for-e2e';
process.env.ADMIN_JWT_ACCESS_TOKEN_EXPIRES_IN =
  process.env.ADMIN_JWT_ACCESS_TOKEN_EXPIRES_IN || '3600';

process.env.LOG_LEVEL = 'error';
