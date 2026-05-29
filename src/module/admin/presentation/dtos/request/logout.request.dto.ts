import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class AdminLogoutRequestDto {
  @ApiProperty({
    description: '리프레시 토큰',
    example: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx:rawToken...',
  })
  @IsString()
  @IsNotEmpty()
  refreshToken: string;
}
