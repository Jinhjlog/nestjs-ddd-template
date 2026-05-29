import * as jwt from 'jsonwebtoken';

const DEFAULT_ACCESS_SECRET = 'test-jwt-access-secret-for-e2e';
const DEFAULT_ACCESS_EXPIRES_IN = 3600;

/**
 * 테스트용 JWT 액세스 토큰을 생성합니다.
 * JwtCoreService가 생성하는 토큰과 동일한 구조로 서명합니다.
 */
export function createTestAccessToken(
  payload: { userId: string; role: string },
  options?: { secret?: string; expiresIn?: number; issuer?: string },
): string {
  return jwt.sign({ payload }, options?.secret ?? DEFAULT_ACCESS_SECRET, {
    algorithm: 'HS256',
    expiresIn: options?.expiresIn ?? DEFAULT_ACCESS_EXPIRES_IN,
    ...(options?.issuer && { issuer: options.issuer }),
  });
}

export function getAdminToken(
  userId: string,
  options?: { secret?: string; issuer?: string },
): string {
  return createTestAccessToken({ userId, role: 'ADMIN' }, options);
}

export function getSuperAdminToken(
  userId: string,
  options?: { secret?: string; issuer?: string },
): string {
  return createTestAccessToken({ userId, role: 'SUPER_ADMIN' }, options);
}

export function getStudentToken(
  userId: string,
  options?: { secret?: string; issuer?: string },
): string {
  return createTestAccessToken({ userId, role: 'STUDENT' }, options);
}
