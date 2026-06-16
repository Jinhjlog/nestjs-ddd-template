import { TokenResponseDto } from '../dtos/response/token.response.dto';

export class UserAuthTransformer {
  /** 발급된 토큰 쌍을 인증 응답 DTO로 변환합니다. */
  static toTokenResponse(tokens: {
    accessToken: string;
    refreshToken: string;
  }): TokenResponseDto {
    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    };
  }
}
