import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class RegisterAdminRequestDto {
  @ApiProperty({
    type: String,
    description: '로그인 아이디 (최대 20자)',
    example: 'newadmin',
  })
  @IsString()
  @IsNotEmpty()
  loginId: string;

  @ApiProperty({
    type: String,
    description: '비밀번호 (8자 이상, 특수문자 1개 이상)',
    example: 'P@ssw0rd!',
  })
  @IsString()
  @IsNotEmpty()
  password: string;

  @ApiProperty({
    type: String,
    description: '이름 (최대 50자)',
    example: '홍길동',
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    type: String,
    description: '이메일',
    example: 'admin@example.com',
    required: false,
  })
  @IsString()
  @IsOptional()
  email?: string;
}
