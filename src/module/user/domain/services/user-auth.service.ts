import { Inject, Injectable, Logger } from '@nestjs/common';
import { USER_JWT } from '../../user-auth.tokens';
import { JwtCoreService } from '@core/jwt/jwt-core.service';
import { AuthResultStatus } from '@core/jwt/interfaces';
import { AuthenticationException, InternalException } from '@shared/exception';
import { RefreshToken } from '../models/refresh-token';
import { RefreshTokenRepository } from '../repositories/refresh-token.repository';
import { User } from '../models/user';

export type IssuedTokens = {
  accessToken: string;
  refreshToken: string;
};

@Injectable()
export class UserAuthService {
  private readonly logger = new Logger(UserAuthService.name);

  constructor(
    @Inject(USER_JWT) private readonly jwtService: JwtCoreService,
    private readonly refreshTokenRepository: RefreshTokenRepository,
  ) {}

  async issueTokens(user: User): Promise<IssuedTokens> {
    return this.createTokenPair(user.id.toString());
  }

  async refreshTokens(token: string): Promise<IssuedTokens> {
    const colonIndex = token.indexOf(':');
    const tokenId = token.substring(0, colonIndex);
    const rawToken = token.substring(colonIndex + 1);

    if (!tokenId || !rawToken) {
      throw new AuthenticationException({
        message: '리프레시 토큰 형식이 올바르지 않습니다.',
        errorCode: 'INVALID_REFRESH_TOKEN_FORMAT',
      });
    }

    const refreshToken = await this.refreshTokenRepository.findById(tokenId);
    if (!refreshToken) {
      throw new AuthenticationException({
        message: '리프레시 토큰을 찾을 수 없습니다.',
        errorCode: 'REFRESH_TOKEN_NOT_FOUND',
      });
    }

    if (refreshToken.isExpired()) {
      await this.refreshTokenRepository.deleteById(tokenId);
      throw new AuthenticationException({
        message: '리프레시 토큰이 만료되었습니다.',
        errorCode: 'REFRESH_TOKEN_EXPIRED',
      });
    }

    const isValid = await refreshToken.verifyToken(rawToken);
    if (!isValid) {
      throw new AuthenticationException({
        message: '리프레시 토큰이 유효하지 않습니다.',
        errorCode: 'INVALID_REFRESH_TOKEN',
      });
    }

    await this.refreshTokenRepository.deleteById(tokenId);

    return this.createTokenPair(refreshToken.userId);
  }

  async logout(token: string): Promise<void> {
    const colonIndex = token.indexOf(':');
    const tokenId = token.substring(0, colonIndex);

    if (!tokenId) {
      return;
    }

    await this.refreshTokenRepository.deleteByIdIfExists(tokenId);
  }

  private async createTokenPair(userId: string): Promise<IssuedTokens> {
    const tokenResult = this.jwtService.createAccessToken({ userId });
    if (tokenResult.status !== AuthResultStatus.SUCCESS) {
      this.logger.error(`액세스 토큰 생성 실패: ${tokenResult.message}`);
      throw new InternalException({
        message: '토큰 생성에 실패했습니다.',
        errorCode: 'TOKEN_CREATION_FAILED',
      });
    }

    const refreshToken = await RefreshToken.issue({ userId });
    await this.refreshTokenRepository.create(refreshToken);

    return {
      accessToken: tokenResult.data,
      refreshToken: `${refreshToken.id.toString()}:${refreshToken.rawToken!}`,
    };
  }
}
