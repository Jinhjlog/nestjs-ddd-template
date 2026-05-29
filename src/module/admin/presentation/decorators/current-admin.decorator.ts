import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Request } from 'express';
import type { AuthenticatedAdmin } from '../guards';

/**
 * `@AdminAuth()` / `@RequireSuperAdmin()` Guard가 주입한 관리자 정보를 꺼내는 파라미터 데코레이터.
 *
 * @example
 * // 전체 관리자 정보
 * @AdminAuth()
 * @Get('me')
 * async getMe(@CurrentAdmin() admin: AuthenticatedAdmin) {
 *   // admin.adminId, admin.role, admin.name
 * }
 *
 * @example
 * // 특정 필드만 추출
 * @AdminAuth()
 * @Get('me')
 * async getMe(@CurrentAdmin('adminId') adminId: string) { ... }
 */
export const CurrentAdmin = createParamDecorator(
  (
    data: keyof AuthenticatedAdmin | undefined,
    ctx: ExecutionContext,
  ): AuthenticatedAdmin | AuthenticatedAdmin[keyof AuthenticatedAdmin] => {
    const request = ctx
      .switchToHttp()
      .getRequest<Request & { admin: AuthenticatedAdmin }>();
    const admin = request.admin;

    if (data) {
      return admin[data];
    }

    return admin;
  },
);
