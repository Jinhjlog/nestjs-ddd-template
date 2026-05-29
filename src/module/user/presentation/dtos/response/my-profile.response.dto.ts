import { ApiProperty } from '@nestjs/swagger';

export class MyProfileResponseDto {
  @ApiProperty({
    type: String,
    description: '사용자 고유 ID',
    example: '01HXK3G5N7MZQR8BVWEY6JKFP4',
  })
  id: string;

  @ApiProperty({
    type: String,
    nullable: true,
    description: '이메일 주소',
    example: 'user@example.com',
  })
  email: string | null;

  @ApiProperty({
    type: String,
    nullable: true,
    description: '사용자 이름',
    example: '홍길동',
  })
  name: string | null;

  @ApiProperty({
    type: String,
    nullable: true,
    description: '전화번호',
    example: '01012345678',
  })
  phone: string | null;

  @ApiProperty({
    type: Boolean,
    description: '활성 상태',
    example: true,
  })
  isActive: boolean;

  @ApiProperty({
    type: Date,
    description: '가입일시',
    example: '2024-01-01T00:00:00.000Z',
  })
  createdAt: Date;
}
