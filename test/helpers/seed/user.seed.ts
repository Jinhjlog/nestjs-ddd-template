import { ulid } from 'ulid';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../../src/module/core/database/prisma.service';

// ─── User ─────────────────────────────────────────────────────────────────────

interface SeedUserOptions {
  id?: string;
  email?: string;
  password?: string;
  name?: string;
  phone?: string;
  isActive?: boolean;
}

interface SeededUser {
  id: string;
  email: string;
  name: string | null;
  phone: string | null;
  isActive: boolean;
}

/** 테스트용 사용자를 DB에 생성합니다. */
export async function seedUser(
  prisma: PrismaService,
  overrides: SeedUserOptions = {},
): Promise<SeededUser> {
  const id = overrides.id ?? ulid();
  const rawPassword = overrides.password ?? 'Test1234!';
  const passwordHash = await bcrypt.hash(rawPassword, 10);

  const user = await prisma.user.create({
    data: {
      id,
      email: overrides.email ?? `user-${id.slice(-6)}@test.com`,
      password: passwordHash,
      name: overrides.name ?? null,
      phone: overrides.phone ?? null,
      isActive: overrides.isActive ?? true,
    },
  });

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    phone: user.phone,
    isActive: user.isActive,
  };
}
