import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString } from 'class-validator';
export class UpdateAdminRequestDto {
  @ApiProperty({
    type: String,
    description: '이름 (최대 50자)',
    example: '홍길동',
    required: false,
  })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiProperty({
    type: String,
    nullable: true,
    description: '이메일 (null 전달 시 제거)',
    example: 'admin@example.com',
    required: false,
  })
  @IsString()
  @IsOptional()
  email?: string | null;

  @ApiProperty({
    type: String,
    description: '관리자 역할',
    enum: ['ADMIN', 'SUPER_ADMIN'],
    example: 'ADMIN',
    required: false,
  })
  @IsString()
  @IsOptional()
  role?: string;

  @ApiProperty({
    type: Boolean,
    description: '활성 상태',
    example: true,
    required: false,
  })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @ApiProperty({
    type: String,
    description: '새 비밀번호 (미입력 시 변경 없음, 최소 8자)',
    example: 'NewP@ss1!',
    required: false,
  })
  @IsString()
  @IsOptional()
  password?: string;
}
