import type { StartedMariaDbContainer } from '@testcontainers/mariadb';

/** globalSetup에서 임시 파일로 저장하고 env-setup.ts에서 읽는 DB 연결 정보 */
export interface TestDbConfig {
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
  databaseUrl: string;
}

declare global {
  // globalSetup에서 저장하고 globalTeardown에서 사용하는 컨테이너 참조
  var __MARIADB_CONTAINER__: StartedMariaDbContainer | undefined;
}
