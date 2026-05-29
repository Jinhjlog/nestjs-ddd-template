import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class AdminRefreshTokenRequestDto {
  @ApiProperty({
    description: '리프레시 토큰',
    example: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx:rawToken...',
  })
  @IsString()
  @IsNotEmpty()
  refreshToken: string;
}
