import { Inject, Injectable, Logger } from '@nestjs/common';
import { ADMIN_JWT } from '../../admin-auth.tokens';
import { JwtCoreService } from '@core/jwt/jwt-core.service';
import { AuthResultStatus } from '@core/jwt/interfaces';
import {
  AuthenticationException,
  DomainAuthenticationException,
} from '@shared/exception';
import { Admin } from '../models/admin';
import { AdminRefreshToken } from '../models/admin-refresh-token';
import { AdminRefreshTokenRepository } from '../repositories/admin-refresh-token.repository';
import { AdminRepository } from '../repositories/admin.repository';

export type AdminIssuedTokens = {
  accessToken: string;
  refreshToken: string;
};

@Injectable()
export class AdminAuthService {
  private readonly logger = new Logger(AdminAuthService.name);

  constructor(
    @Inject(ADMIN_JWT) private readonly jwtService: JwtCoreService,
    private readonly adminRepository: AdminRepository,
    private readonly adminRefreshTokenRepository: AdminRefreshTokenRepository,
  ) {}

  async issueTokens(admin: Admin): Promise<AdminIssuedTokens> {
    return this.createTokenPair(admin.id.toString(), admin.role.value);
  }

  async refreshTokens(token: string): Promise<AdminIssuedTokens> {
    const colonIndex = token.indexOf(':');
    const tokenId = token.substring(0, colonIndex);
    const rawToken = token.substring(colonIndex + 1);

    if (!tokenId || !rawToken) {
      throw new DomainAuthenticationException({
        message: '리프레시 토큰 형식이 올바르지 않습니다.',
        errorCode: 'INVALID_REFRESH_TOKEN_FORMAT',
      });
    }

    const refreshToken =
      await this.adminRefreshTokenRepository.findById(tokenId);
    if (!refreshToken) {
      throw new DomainAuthenticationException({
        message: '리프레시 토큰을 찾을 수 없습니다.',
        errorCode: 'REFRESH_TOKEN_NOT_FOUND',
      });
    }

    if (refreshToken.isExpired()) {
      await this.adminRefreshTokenRepository.deleteByIdIfExists(tokenId);
      throw new DomainAuthenticationException({
        message: '리프레시 토큰이 만료되었습니다.',
        errorCode: 'REFRESH_TOKEN_EXPIRED',
      });
    }

    const isValid = await refreshToken.verifyToken(rawToken);
    if (!isValid) {
      throw new DomainAuthenticationException({
        message: '리프레시 토큰이 유효하지 않습니다.',
        errorCode: 'INVALID_REFRESH_TOKEN',
      });
    }

    // 기존 토큰 삭제 (일회용 rotation)
    await this.adminRefreshTokenRepository.deleteByIdIfExists(tokenId);

    // 최신 role을 반영하기 위해 DB에서 관리자 조회
    const admin = await this.adminRepository.findById(refreshToken.adminId);
    if (!admin || !admin.isActive) {
      throw new DomainAuthenticationException({
        message: '유효하지 않은 관리자 계정입니다.',
        errorCode: 'ADMIN_NOT_FOUND_OR_INACTIVE',
      });
    }

    return this.createTokenPair(admin.id.toString(), admin.role.value);
  }

  async logout(token: string): Promise<void> {
    const colonIndex = token.indexOf(':');
    const tokenId = token.substring(0, colonIndex);

    if (!tokenId) {
      return;
    }

    await this.adminRefreshTokenRepository.deleteByIdIfExists(tokenId);
  }

  private async createTokenPair(
    adminId: string,
    role: string,
  ): Promise<AdminIssuedTokens> {
    const tokenResult = this.jwtService.createAccessToken({ adminId, role });

    if (tokenResult.status !== AuthResultStatus.SUCCESS) {
      this.logger.error(`관리자 액세스 토큰 생성 실패: ${tokenResult.message}`);
      throw new AuthenticationException({
        message: '토큰 생성에 실패했습니다.',
        errorCode: 'TOKEN_CREATION_FAILED',
      });
    }

    const refreshToken = await AdminRefreshToken.issue({ adminId });
    await this.adminRefreshTokenRepository.create(refreshToken);

    return {
      accessToken: tokenResult.data,
      refreshToken: `${refreshToken.id.toString()}:${refreshToken.rawToken!}`,
    };
  }
}
