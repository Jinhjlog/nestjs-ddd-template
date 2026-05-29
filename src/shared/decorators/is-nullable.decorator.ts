import { ValidateIf } from 'class-validator';

/**
 * PATCH 요청의 nullable 필드용 검증 데코레이터.
 *
 * RFC 7396 (JSON Merge Patch) 시맨틱을 따릅니다:
 * - undefined (미전송): 검증 스킵 → 필드 수정 안 함
 * - null: 검증 스킵 → DB에서 값 제거 (NULL 저장)
 * - 실제 값: 검증 실행 → 값 업데이트
 *
 * @example
 * ```typescript
 * // nullable 필드 (parentId를 null로 보내면 DB에서 NULL로 설정)
 * @IsNullable()
 * @IsString()
 * parentId?: string | null;
 *
 * // non-nullable 필드에는 @IsOptional()을 사용하세요
 * @IsOptional()
 * @IsString()
 * @IsNotEmpty()
 * name?: string;
 * ```
 */
export function IsNullable(): PropertyDecorator {
  return ValidateIf((_, value) => value !== null && value !== undefined);
}
