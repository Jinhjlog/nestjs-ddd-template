import {
  applyDecorators,
  HttpStatus,
  SetMetadata,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { ApiProblemResponse } from '@shared/swagger';
import { AdminRoleValues } from '../../domain/models/admin';
import {
  AdminJwtGuard,
  AdminRoleGuard,
  REQUIRE_ADMIN_ROLE_KEY,
} from '../guards';

/**
 * 관리자 JWT 인증이 필요한 엔드포인트에 적용하는 통합 데코레이터.
 *
 * 포함 기능:
 * - `@UseGuards(AdminJwtGuard)` — 관리자 JWT 검증 + DB 관리자 조회
 * - `@ApiBearerAuth('access-token')` — Swagger 인증 헤더 표시
 * - `@ApiProblemResponse` — 401 에러(problem+json) 문서화
 *
 * @example
 * @AdminAuth()
 * @Get('stats')
 * async getStats(@CurrentAdmin() admin: AuthenticatedAdmin) { ... }
 */
export function AdminAuth(): MethodDecorator & ClassDecorator {
  return applyDecorators(
    UseGuards(AdminJwtGuard),
    ApiBearerAuth('access-token'),
    ApiProblemResponse(
      HttpStatus.UNAUTHORIZED,
      '인증 실패 (401)<br>' +
        '- 액세스 토큰 미제공: _**ACCESS_TOKEN_MISSING**_<br>' +
        '- 액세스 토큰 만료: _**ACCESS_TOKEN_EXPIRED**_<br>' +
        '- 유효하지 않은 액세스 토큰: _**INVALID_ACCESS_TOKEN**_<br>' +
        '- 관리자 미존재 또는 비활성: _**ADMIN_NOT_FOUND_OR_INACTIVE**_<br>',
    ),
  );
}

/**
 * 최고 관리자(SUPER_ADMIN) 전용 엔드포인트에 적용하는 통합 데코레이터.
 *
 * 포함 기능:
 * - `@UseGuards(AdminJwtGuard, AdminRoleGuard)` — JWT 검증 + SUPER_ADMIN 역할 검증
 * - `@ApiBearerAuth('access-token')` — Swagger 인증 헤더 표시
 * - `@ApiProblemResponse` — 401 에러(problem+json) 문서화
 * - `@ApiProblemResponse` — 403 에러(problem+json) 문서화
 *
 * @example
 * @RequireSuperAdmin()
 * @Post('admins')
 * async createAdmin(@CurrentAdmin() admin: AuthenticatedAdmin) { ... }
 */
export function RequireSuperAdmin(): MethodDecorator & ClassDecorator {
  return applyDecorators(
    SetMetadata(REQUIRE_ADMIN_ROLE_KEY, AdminRoleValues.SUPER_ADMIN),
    UseGuards(AdminJwtGuard, AdminRoleGuard),
    ApiBearerAuth('access-token'),
    ApiProblemResponse(
      HttpStatus.UNAUTHORIZED,
      '인증 실패 (401)<br>' +
        '- 액세스 토큰 미제공: _**ACCESS_TOKEN_MISSING**_<br>' +
        '- 액세스 토큰 만료: _**ACCESS_TOKEN_EXPIRED**_<br>' +
        '- 유효하지 않은 액세스 토큰: _**INVALID_ACCESS_TOKEN**_<br>' +
        '- 관리자 미존재 또는 비활성: _**ADMIN_NOT_FOUND_OR_INACTIVE**_<br>',
    ),
    ApiProblemResponse(
      HttpStatus.FORBIDDEN,
      '권한 없음 (403)<br>- SUPER_ADMIN 역할 필요: _**FORBIDDEN_ADMIN_ROLE**_',
    ),
  );
}
