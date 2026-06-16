import { LoginResponseDto } from '../dtos/response/login.response.dto';

export class AdminAuthTransformer {
  /** 발급된 토큰 쌍을 인증 응답 DTO로 변환합니다. */
  static toTokenResponse(tokens: {
    accessToken: string;
    refreshToken: string;
  }): LoginResponseDto {
    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    };
  }
}
