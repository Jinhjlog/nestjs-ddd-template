import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Request } from 'express';
import type { AuthenticatedUser } from '../guards';

export function currentUserFactory(
  data: keyof AuthenticatedUser | undefined,
  ctx: ExecutionContext,
): AuthenticatedUser | AuthenticatedUser[keyof AuthenticatedUser] {
  const request = ctx
    .switchToHttp()
    .getRequest<Request & { user: AuthenticatedUser }>();
  const user = request.user;

  if (data) {
    return user[data];
  }

  return user;
}

/**
 * `@UserAuth()` Guard가 주입한 인증 사용자 정보를 꺼내는 파라미터 데코레이터.
 *
 * @example
 * // 전체 사용자 정보
 * @UserAuth()
 * @Get('profile')
 * async getProfile(@CurrentUser() user: AuthenticatedUser) {
 *   // user.userId, user.email, user.name, user.phone
 * }
 *
 * @example
 * // 특정 필드만 추출
 * @UserAuth()
 * @Get('me')
 * async getMe(@CurrentUser('userId') userId: string) { ... }
 */
export const CurrentUser = createParamDecorator(currentUserFactory);
