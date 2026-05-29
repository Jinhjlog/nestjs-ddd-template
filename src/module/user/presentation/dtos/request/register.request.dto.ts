import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class RegisterRequestDto {
  @ApiProperty({ description: '이메일', example: 'user@example.com' })
  @IsString()
  @IsNotEmpty()
  email: string;

  @ApiProperty({
    description: '비밀번호 (8자 이상, 특수문자 포함)',
    example: 'Password1!',
  })
  @IsString()
  @IsNotEmpty()
  password: string;

  @ApiProperty({
    description: '사용자 이름',
    example: '홍길동',
    required: false,
  })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiProperty({
    description: '전화번호',
    example: '01012345678',
    required: false,
  })
  @IsString()
  @IsOptional()
  phone?: string;
}
