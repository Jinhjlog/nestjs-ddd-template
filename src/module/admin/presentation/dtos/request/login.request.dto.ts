import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class LoginRequestDto {
  @ApiProperty({
    description: '관리자 로그인 아이디',
    example: 'admin01',
  })
  @IsString()
  @IsNotEmpty()
  loginId: string;

  @ApiProperty({
    description: '비밀번호',
    example: 'P@ssw0rd!',
  })
  @IsString()
  @IsNotEmpty()
  password: string;
}
