import { ApiProperty } from '@nestjs/swagger';

/** 관리자 인증 토큰 응답 (로그인·토큰 갱신 공통) */
export class AdminTokenResponseDto {
  @ApiProperty({
    description: '액세스 토큰 (Authorization 헤더에 Bearer로 사용)',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  accessToken: string;

  @ApiProperty({
    description: '리프레시 토큰 (토큰 갱신 시 사용)',
    example: 'bf40736b637dd9af16d254f18f08adfe02e8e0cc6e5e...',
  })
  refreshToken: string;
}
