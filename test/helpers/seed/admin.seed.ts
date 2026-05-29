import * as bcrypt from 'bcrypt';
import { ulid } from 'ulid';
import { PrismaService } from '../../../src/module/core/database/prisma.service';

type AdminRole = 'SUPER_ADMIN' | 'ADMIN';

interface SeedAdminOptions {
  id?: string;
  loginId?: string;
  password?: string;
  name?: string;
  email?: string;
  role?: AdminRole;
  isActive?: boolean;
}

interface SeededAdmin {
  id: string;
  loginId: string;
  name: string;
  email: string | null;
  role: AdminRole;
  isActive: boolean;
}

const DEFAULT_PASSWORD = 'P@ssw0rd!';

/**
 * 테스트용 관리자 계정을 DB에 생성합니다.
 * 비밀번호는 bcrypt(salt round 10)로 해시됩니다.
 */
export async function seedAdmin(
  prisma: PrismaService,
  overrides: SeedAdminOptions = {},
): Promise<SeededAdmin> {
  const id = overrides.id ?? ulid();
  const loginId = overrides.loginId ?? `test-admin-${id.slice(-6)}`;
  const password = overrides.password ?? DEFAULT_PASSWORD;
  const passwordHash = await bcrypt.hash(password, 10);

  const admin = await prisma.admin.create({
    data: {
      id,
      loginId,
      passwordHash,
      name: overrides.name ?? '테스트관리자',
      email: overrides.email ?? `${loginId}@test.com`,
      role: overrides.role ?? 'ADMIN',
      isActive: overrides.isActive ?? true,
    },
  });

  return {
    id: admin.id,
    loginId: admin.loginId,
    name: admin.name,
    email: admin.email,
    role: admin.role as AdminRole,
    isActive: admin.isActive,
  };
}

/** SUPER_ADMIN 역할의 관리자를 생성합니다. */
export async function seedSuperAdmin(
  prisma: PrismaService,
  overrides: Omit<SeedAdminOptions, 'role'> = {},
): Promise<SeededAdmin> {
  return seedAdmin(prisma, { ...overrides, role: 'SUPER_ADMIN' });
}
