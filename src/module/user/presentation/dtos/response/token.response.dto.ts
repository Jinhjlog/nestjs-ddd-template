import { ApiProperty } from '@nestjs/swagger';

/** 인증 토큰 응답 (로그인·회원가입·토큰 갱신 공통) */
export class TokenResponseDto {
  @ApiProperty({
    description: '액세스 토큰 (Authorization 헤더에 Bearer로 사용)',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  accessToken: string;

  @ApiProperty({
    description: '리프레시 토큰 (토큰 갱신 시 사용)',
    example: '01JFXYZ1234567890ABCDEF:a1b2c3d4e5f6...',
  })
  refreshToken: string;
}
