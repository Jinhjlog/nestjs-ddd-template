import { ApiProperty } from '@nestjs/swagger';

export class RefreshTokenResponseDto {
  @ApiProperty({
    description: '새로 발급된 액세스 토큰',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  accessToken: string;

  @ApiProperty({
    description: '새로 발급된 리프레시 토큰',
    example: '01JFXYZ1234567890ABCDEF:a1b2c3d4e5f6...',
  })
  refreshToken: string;
}
