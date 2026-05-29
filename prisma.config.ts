import { config } from 'dotenv';

// Docker/Dokploy 환경에서는 환경변수가 직접 주입되므로 .env 파일 불필요
// 로컬 개발 시에만 .env.{NODE_ENV} 파일 로드
if (!process.env['DATABASE_URL']) {
  config({ path: `.env.${process.env['NODE_ENV'] || 'development'}` });
}

import { defineConfig } from 'prisma/config';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  datasource: {
    url: process.env['DATABASE_URL'],
  },
});
