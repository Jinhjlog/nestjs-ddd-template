/**
 * 관리자 계정 초기 데이터 시드
 *
 * 기본 관리자 계정을 admins 테이블에 시드합니다.
 * 비밀번호는 Test@123 으로 통일 (bcrypt hash, salt round 10)
 *
 * 실행: npm run prisma:seed:dev prisma/seed-admins.ts
 */

import mysql from 'mysql2/promise';
import * as bcrypt from 'bcrypt';

const DB = {
  host: process.env.DB_HOST ?? 'localhost',
  port: Number(process.env.DB_PORT ?? 3306),
  user: process.env.DB_USER ?? 'root',
  password: process.env.DB_PASSWORD ?? 'root',
  database: process.env.DB_NAME ?? 'app_db',
};

const DEFAULT_PASSWORD = 'Test@123';

interface SeedAdmin {
  id: string;
  loginId: string;
  name: string;
  email: string;
  role: 'SUPER_ADMIN' | 'ADMIN';
}

const ADMINS: SeedAdmin[] = [
  {
    id: '01JNQVG0R1ADM00001ADMIN01',
    loginId: 'admin',
    name: '관리자',
    email: 'admin@test.com',
    role: 'SUPER_ADMIN',
  },
  {
    id: '01JNQVG0R1ADM00002ADMIN02',
    loginId: 'manager',
    name: '일반관리자',
    email: 'manager@test.com',
    role: 'ADMIN',
  },
];

async function main() {
  const conn = await mysql.createConnection(DB);
  const passwordHash = await bcrypt.hash(DEFAULT_PASSWORD, 10);

  try {
    console.log('관리자 계정 시드 시작...');
    console.log(`  비밀번호: ${DEFAULT_PASSWORD} (bcrypt)\n`);

    let inserted = 0;
    let skipped = 0;

    for (const admin of ADMINS) {
      const [rows] = await conn.execute(
        'SELECT id FROM admins WHERE login_id = ?',
        [admin.loginId],
      );

      const existing = (rows as { id: string }[])[0];

      if (existing) {
        console.log(`  [SKIP] ${admin.loginId} (${admin.name}) — 이미 존재`);
        skipped++;
        continue;
      }

      await conn.execute(
        `INSERT INTO admins (id, login_id, password_hash, name, email, role, is_active, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, true, NOW(), NOW())`,
        [
          admin.id,
          admin.loginId,
          passwordHash,
          admin.name,
          admin.email,
          admin.role,
        ],
      );

      console.log(
        `  [INSERT] ${admin.loginId} (${admin.name}) → ${admin.role}`,
      );
      inserted++;
    }

    console.log(`\n완료: ${inserted}건 추가, ${skipped}건 스킵`);
  } finally {
    await conn.end();
  }
}

main().catch((err) => {
  console.error('시드 실패:', err);
  process.exit(1);
});
