import { BadRequestException } from '@nestjs/common';

/**
 * 커서 기반 페이지네이션 파라미터
 */
export interface FindManyParams<
  T extends Record<string, string> = Record<string, string>,
> {
  cursor?: T | null;
  limit: number;
}

/**
 * 커서 기반 페이지네이션을 위한 커서 인코딩/디코딩 유틸리티
 *
 * - ULID(26자) 기반 프로젝트에 맞게 설계
 * - 단일 키(`{ id, createdAt }`) 및 복합 키(`{ userId, postId }`) 모두 지원
 */
export class CursorUtil {
  /** ULID 형식 (Crockford Base32, 26자) */
  private static readonly ULID_REGEX = /^[0-9A-HJKMNP-TV-Z]{26}$/i;

  /**
   * ULID 형식 검증
   */
  static isValidUlid(id: string): boolean {
    return this.ULID_REGEX.test(id);
  }

  /**
   * 커서 데이터를 Base64로 인코딩합니다.
   *
   * @example
   * // 단일 엔티티 커서
   * CursorUtil.encode({ id: '01K8AK2Y81AKXPNZHT3YYVRYPD', createdAt: new Date() });
   *
   * // 복합 커서
   * CursorUtil.encode({ userId: '01K8AK...', postId: '01KJ4K...' });
   */
  static encode(data: Record<string, string | Date>): string {
    const payload: Record<string, string> = {};
    for (const [key, value] of Object.entries(data)) {
      payload[key] = value instanceof Date ? value.toISOString() : value;
    }
    return Buffer.from(JSON.stringify(payload)).toString('base64');
  }

  /**
   * Base64로 인코딩된 커서를 디코딩하고, 필수 키 존재를 검증합니다.
   *
   * @param cursor - Base64로 인코딩된 커서 문자열
   * @param requiredKeys - 반드시 포함되어야 하는 키 목록
   * @throws {BadRequestException} 커서가 유효하지 않은 경우
   *
   * @example
   * // 단일 엔티티 커서
   * CursorUtil.decode<{ id: string; createdAt: string }>(cursor, ['id', 'createdAt']);
   *
   * // 복합 커서
   * CursorUtil.decode<{ userId: string; postId: string }>(cursor, ['userId', 'postId']);
   */
  static decode<T extends Record<string, string>>(
    cursor: string,
    requiredKeys: (keyof T & string)[],
  ): T {
    if (!cursor || cursor.trim().length === 0) {
      throw new BadRequestException('INVALID_CURSOR');
    }

    try {
      const json = Buffer.from(cursor, 'base64').toString('utf-8');
      const parsed: unknown = JSON.parse(json);

      if (typeof parsed !== 'object' || parsed === null) {
        throw new BadRequestException('INVALID_CURSOR');
      }

      const data = parsed as Record<string, unknown>;

      for (const key of requiredKeys) {
        if (!(key in data) || typeof data[key] !== 'string') {
          throw new BadRequestException('INVALID_CURSOR');
        }
      }

      return data as T;
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('INVALID_CURSOR');
    }
  }
}
