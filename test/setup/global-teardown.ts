import * as fs from 'fs';
import * as path from 'path';

const CONFIG_PATH = path.join(__dirname, '..', '.test-db-config.json');

export default async function globalTeardown() {
  console.log('\n🧹 MariaDB 테스트 컨테이너 정리 중...');

  // 컨테이너 중지
  const container = global.__MARIADB_CONTAINER__;
  if (container) {
    await container.stop();
  }

  // 임시 설정 파일 삭제
  if (fs.existsSync(CONFIG_PATH)) {
    fs.unlinkSync(CONFIG_PATH);
  }

  console.log('✅ 테스트 환경 정리 완료\n');
}
