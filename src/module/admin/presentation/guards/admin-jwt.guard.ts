import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
} from '@nestjs/common';
import { Request } from 'express';
import { JwtCoreService } from '@core/jwt/jwt-core.service';
import { AuthResultStatus } from '@core/jwt/interfaces';
import { AuthenticationException, InternalException } from '@shared/exception';
import { ADMIN_JWT } from '../../admin-auth.tokens';
import { AdminRepository } from '../../domain/repositories/admin.repository';
import type { AuthenticatedAdmin } from './authenticated-admin';

export interface AdminTokenPayload {
  adminId: string;
  role: string;
}

@Injectable()
export class AdminJwtGuard implements CanActivate {
  constructor(
    @Inject(ADMIN_JWT) private readonly jwtService: JwtCoreService,
    private readonly adminRepository: AdminRepository,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const token = this.extractBearerToken(request);

    if (!token) {
      throw new AuthenticationException({
        message: '액세스 토큰이 제공되지 않았습니다.',
        errorCode: 'ACCESS_TOKEN_MISSING',
      });
    }

    const result = this.jwtService.verifyAccessToken(token);

    if (result.status !== AuthResultStatus.SUCCESS) {
      // 인프라 오류는 서버측 실패 → 500. 토큰 만료/무효는 인증 실패 → 401.
      if (result.status === AuthResultStatus.INFRASTRUCTURE_ERROR) {
        throw new InternalException({
          message: result.message,
          errorCode: 'INFRASTRUCTURE_ERROR',
        });
      }
      throw new AuthenticationException({
        message: result.message,
        errorCode: result.status,
      });
    }

    const payload = result.data.payload as AdminTokenPayload;
    const admin = await this.adminRepository.findById(payload.adminId);

    if (!admin || !admin.isActive) {
      throw new AuthenticationException({
        message: '관리자를 찾을 수 없거나 비활성 상태입니다.',
        errorCode: 'ADMIN_NOT_FOUND_OR_INACTIVE',
      });
    }

    (request as Request & { admin: AuthenticatedAdmin }).admin = {
      adminId: admin.id.toString(),
      role: admin.role.value,
      name: admin.name.value,
    };

    return true;
  }

  private extractBearerToken(request: Request): string | null {
    const authorization = request.headers.authorization;
    if (!authorization) return null;

    const [scheme, token] = authorization.split(' ');
    if (scheme !== 'Bearer' || !token) return null;

    return token;
  }
}
