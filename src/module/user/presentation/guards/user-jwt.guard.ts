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
import { USER_JWT } from '../../user-auth.tokens';
import { UserRepository } from '../../domain/repositories/user.repository';
import type { AuthenticatedUser } from './authenticated-user';

export interface UserTokenPayload {
  userId: string;
}

@Injectable()
export class UserJwtGuard implements CanActivate {
  constructor(
    @Inject(USER_JWT) private readonly jwtService: JwtCoreService,
    private readonly userRepository: UserRepository,
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

    const payload = result.data.payload as UserTokenPayload;
    const user = await this.userRepository.findById(payload.userId);

    if (!user || !user.isActive) {
      throw new AuthenticationException({
        message: '사용자를 찾을 수 없거나 비활성 상태입니다.',
        errorCode: 'USER_NOT_FOUND_OR_INACTIVE',
      });
    }

    (request as Request & { user: AuthenticatedUser }).user = {
      userId: user.id.toString(),
      email: user.email.value,
      name: user.name?.value,
      phone: user.phone?.value,
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
