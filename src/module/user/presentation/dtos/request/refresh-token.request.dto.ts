import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class RefreshTokenRequestDto {
  @ApiProperty({
    description: '리프레시 토큰 ({tokenId}:{rawToken} 형식)',
    example: '01JFXYZ1234567890ABCDEF:a1b2c3d4e5f6...',
  })
  @IsString()
  @IsNotEmpty()
  refreshToken: string;
}
