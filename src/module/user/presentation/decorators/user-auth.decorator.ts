import { applyDecorators, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiUnauthorizedResponse } from '@nestjs/swagger';
import { UserJwtGuard } from '../guards';

/**
 * JWT 인증이 필요한 엔드포인트에 적용하는 통합 데코레이터.
 *
 * 포함 기능:
 * - `@UseGuards(UserJwtGuard)` — JWT 검증 + DB 사용자 조회
 * - `@ApiBearerAuth('access-token')` — Swagger 인증 헤더 표시
 * - `@ApiUnauthorizedResponse` — 401 에러코드 문서화
 *
 * @example
 * // 메서드 레벨
 * @UserAuth()
 * @Get('profile')
 * async getProfile(@CurrentUser() user: AuthenticatedUser) {
 *   // user.userId, user.email, user.name, user.phone
 * }
 *
 * @example
 * // 클래스 레벨 — 모든 엔드포인트에 인증 적용
 * @UserAuth()
 * @Controller('users')
 * export class UserController {
 *   @Get('me')
 *   async getMe(@CurrentUser('userId') userId: string) { ... }
 * }
 */
export function UserAuth(): MethodDecorator & ClassDecorator {
  return applyDecorators(
    UseGuards(UserJwtGuard),
    ApiBearerAuth('access-token'),
    ApiUnauthorizedResponse({
      description:
        '인증 실패 (401)<br>' +
        '- 액세스 토큰 미제공: _**ACCESS_TOKEN_MISSING**_<br>' +
        '- 액세스 토큰 만료: _**ACCESS_TOKEN_EXPIRED**_<br>' +
        '- 유효하지 않은 액세스 토큰: _**INVALID_ACCESS_TOKEN**_<br>' +
        '- 사용자 미존재 또는 비활성: _**USER_NOT_FOUND_OR_INACTIVE**_<br>',
    }),
  );
}
