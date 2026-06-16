import { ApiProperty } from '@nestjs/swagger';
import {
  IsBoolean,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';

export class GetAdminUserListRequestDto {
  @ApiProperty({
    description: '페이지 번호 (최소 1)',
    example: 1,
    required: false,
    default: 1,
    minimum: 1,
  })
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @IsOptional()
  page?: number;

  @ApiProperty({
    description: '페이지당 항목 수 (최소 1, 최대 100)',
    example: 20,
    required: false,
    default: 20,
    minimum: 1,
    maximum: 100,
  })
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
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
