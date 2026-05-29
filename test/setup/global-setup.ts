import { MariaDbContainer } from '@testcontainers/mariadb';
import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

const CONFIG_PATH = path.join(__dirname, '..', '.test-db-config.json');

export default async function globalSetup() {
  console.log('\n🐳 MariaDB 테스트 컨테이너 시작 중...');

  const container = await new MariaDbContainer('mariadb:11')
    .withDatabase('test_app_db')
    .withRootPassword('test123')
    .withCommand([
      '--character-set-server=utf8mb4',
      '--collation-server=utf8mb4_unicode_ci',
    ])
    .start();

  const host = container.getHost();
  const port = container.getMappedPort(3306);
  const database = 'test_app_db';
  const username = 'root';
  const password = 'test123';
  const databaseUrl = `mysql://${username}:${password}@${host}:${port}/${database}`;

  // 테스트 워커에서 사용할 DB 연결 정보를 임시 파일에 저장
  fs.writeFileSync(
    CONFIG_PATH,
    JSON.stringify({ host, port, database, username, password, databaseUrl }),
  );

  // Prisma 스키마를 테스트 DB에 적용 (--url로 직접 전달)
  console.log('📦 Prisma 스키마 적용 중...');
  execSync(`npx prisma db push --url "${databaseUrl}" --accept-data-loss`, {
    env: { ...process.env, DATABASE_URL: databaseUrl },
    stdio: 'pipe',
    cwd: path.join(__dirname, '..', '..'),
  });

  // globalTeardown에서 컨테이너를 중지하기 위해 참조 저장
  global.__MARIADB_CONTAINER__ = container;

  console.log(`✅ MariaDB 테스트 컨테이너 준비 완료 (port: ${port})\n`);
}
