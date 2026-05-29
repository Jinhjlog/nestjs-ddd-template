import { Inject, Injectable, Logger } from '@nestjs/common';
import * as jwt from 'jsonwebtoken';
import { JwtHelpers } from './utils/jwt.helpers';
import { JWT_MODULE_OPTIONS } from './jwt.constants';
import type { AuthResult, JwtModuleOptions, TokenPayload } from './interfaces';
import {
  AuthResultStatus,
  type CreateAccessTokenErrorStatus,
  type CustomTokenPayload,
  type VerifyAccessTokenErrorStatus,
} from './interfaces';

@Injectable()
export class JwtCoreService {
  private readonly logger = new Logger(JwtCoreService.name);
  private readonly helper: JwtHelpers;

  constructor(
    @Inject(JWT_MODULE_OPTIONS)
    private readonly options: JwtModuleOptions,
  ) {
    this.helper = new JwtHelpers(this.logger);
  }

  createAccessToken(
    payload: CustomTokenPayload,
  ): AuthResult<string, CreateAccessTokenErrorStatus> {
    try {
      const accessToken = jwt.sign({ payload }, this.options.accessSecret, {
        algorithm: 'HS256',
        expiresIn: this.options.accessTokenExpiresIn,
        ...(this.options.issuer && { issuer: this.options.issuer }),
      });

      return this.helper.success(accessToken);
    } catch (error) {
      return this.helper.infrastructureError(error, '토큰 생성 중 오류 발생');
    }
  }

  verifyAccessToken(
    accessToken: string,
  ): AuthResult<
    TokenPayload<CustomTokenPayload>,
    VerifyAccessTokenErrorStatus
  > {
    try {
      const decoded = jwt.verify(accessToken, this.options.accessSecret, {
        algorithms: ['HS256'],
        ...(this.options.issuer && { issuer: this.options.issuer }),
      }) as TokenPayload<CustomTokenPayload>;

      return this.helper.success(decoded);
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        return this.helper.failure(
          AuthResultStatus.ACCESS_TOKEN_EXPIRED,
          '액세스 토큰이 만료되었습니다.',
        );
      }

      if (error instanceof jwt.JsonWebTokenError) {
        return this.helper.failure(
          AuthResultStatus.INVALID_ACCESS_TOKEN,
          '유효하지 않은 액세스 토큰입니다.',
        );
      }

      return this.helper.infrastructureError(
        error,
        '액세스 토큰 검증 중 오류 발생',
      );
    }
  }
}
