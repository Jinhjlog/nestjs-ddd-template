import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class UserLoginRequestDto {
  @ApiProperty({ description: '이메일', example: 'user@example.com' })
  @IsString()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ description: '비밀번호', example: 'Test1234!' })
  @IsString()
  @IsNotEmpty()
  password: string;
}
