import { ValueObject } from '@lib/domain';
import { ValueObjectValidationException } from '@shared/exception';

export const UrlError = {
  InvalidUrl: '유효하지 않은 URL 형식입니다.',
} as const;

interface UrlProps {
  value: string;
}

/**
 * HTTP/HTTPS URL 값 객체
 *
 * http 또는 https 프로토콜을 가진 유효한 URL만 허용하는 범용 URL VO입니다.
 *
 * @example
 * // 클릭 시 이동 링크
 * const linkUrl = Url.create('https://example.com/event');
 *
 * @example
 * // 게임 URL
 * const gameUrl = Url.create('https://game.example.com/puzzle?level=1');
 */
export class Url extends ValueObject<UrlProps> {
  private constructor(props: UrlProps) {
    super(props);
  }

  get value(): string {
    return this.props.value;
  }

  private static isValidUrl(value: string): boolean {
    try {
      const url = new URL(value);
      return url.protocol === 'http:' || url.protocol === 'https:';
    } catch {
      return false;
    }
  }

  /**
   * URL을 생성합니다.
   *
   * @throws {ValueObjectValidationException} INVALID_URL_FORMAT - 유효하지 않은 URL 형식입니다.
   */
  static create(value: string): Url {
    if (!this.isValidUrl(value)) {
      throw new ValueObjectValidationException({
        entityName: Url.name,
        reason: UrlError.InvalidUrl,
        errorCode: 'INVALID_URL_FORMAT',
      });
    }

    return new Url({ value });
  }

  static unsafeCreate(value: string): Url {
    return new Url({ value });
  }
}
