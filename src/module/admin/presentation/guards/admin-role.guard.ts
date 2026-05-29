import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { AuthorizationException } from '@shared/exception';
import type { AuthenticatedAdmin } from './authenticated-admin';

export const REQUIRE_ADMIN_ROLE_KEY = 'requireAdminRole';

@Injectable()
export class AdminRoleGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRole = this.reflector.getAllAndOverride<string>(
      REQUIRE_ADMIN_ROLE_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredRole) return true;

    const request = context
      .switchToHttp()
      .getRequest<Request & { admin: AuthenticatedAdmin }>();

    if (request.admin.role !== requiredRole) {
      throw new AuthorizationException({
        message: '접근 권한이 없습니다.',
        errorCode: 'FORBIDDEN_ADMIN_ROLE',
      });
    }

    return true;
  }
}
