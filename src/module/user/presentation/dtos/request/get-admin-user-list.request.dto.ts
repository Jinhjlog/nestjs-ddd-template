import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsNumber, IsOptional, IsString } from 'class-validator';
import { Transform, Type } from 'class-transformer';

export class GetAdminUserListRequestDto {
  @ApiProperty({ description: '페이지 번호', example: 1, required: false })
  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  page?: number;

  @ApiProperty({
    description: '페이지당 항목 수',
    example: 20,
    required: false,
  })
  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  limit?: number;

  @ApiProperty({
    description: '이름 검색 (부분 일치)',
    example: '홍길동',
    required: false,
  })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiProperty({
    description: '활성 상태 필터',
    example: true,
    required: false,
  })
  @Transform(({ value }: { value: unknown }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value as boolean;
  })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
