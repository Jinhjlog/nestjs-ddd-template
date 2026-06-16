import { AdminTokenResponseDto } from '../dtos/response/admin-token.response.dto';

export class AdminAuthTransformer {
  /** 발급된 토큰 쌍을 인증 응답 DTO로 변환합니다. */
  static toTokenResponse(tokens: {
    accessToken: string;
    refreshToken: string;
  }): AdminTokenResponseDto {
    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    };
  }
}
