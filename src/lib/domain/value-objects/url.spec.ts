import { ValueObjectValidationException } from '@shared/exception';
import { Url, UrlError } from './url';

describe('Url', () => {
  describe('유효성 검사', () => {
    it('URL 형식이 올바르지 않으면 예외를 던진다.', () => {
      // given
      const invalidUrl = 'invalid-url';

      // when & then
      expect(() => Url.create(invalidUrl)).toThrow(
        new ValueObjectValidationException({
          detail: UrlError.InvalidUrl,
          code: 'INVALID_URL_FORMAT',
        }),
      );
    });

    it('프로토콜이 없는 URL은 유효하지 않다.', () => {
      // given
      const urlWithoutProtocol = 'example.com/path';

      // when & then
      expect(() => Url.create(urlWithoutProtocol)).toThrow(
        new ValueObjectValidationException({
          detail: UrlError.InvalidUrl,
          code: 'INVALID_URL_FORMAT',
        }),
      );
    });

    it('ftp 프로토콜은 유효하지 않다.', () => {
      // given
      const ftpUrl = 'ftp://example.com';

      // when & then
      expect(() => Url.create(ftpUrl)).toThrow(
        new ValueObjectValidationException({
          detail: UrlError.InvalidUrl,
          code: 'INVALID_URL_FORMAT',
        }),
      );
    });

    it('빈 문자열은 유효하지 않다.', () => {
      // given
      const emptyUrl = '';

      // when & then
      expect(() => Url.create(emptyUrl)).toThrow(
        new ValueObjectValidationException({
          detail: UrlError.InvalidUrl,
          code: 'INVALID_URL_FORMAT',
        }),
      );
    });
  });

  describe('create', () => {
    it('http 프로토콜의 URL 객체를 생성한다.', () => {
      // given
      const httpUrl = 'http://example.com/path';

      // when
      const url = Url.create(httpUrl);

      // then
      expect(url).toBeInstanceOf(Url);
      expect(url.value).toBe(httpUrl);
    });

    it('https 프로토콜의 URL 객체를 생성한다.', () => {
      // given
      const httpsUrl = 'https://example.com/path';

      // when
      const url = Url.create(httpsUrl);

      // then
      expect(url).toBeInstanceOf(Url);
      expect(url.value).toBe(httpsUrl);
    });

    it('쿼리 파라미터가 포함된 URL 객체를 생성한다.', () => {
      // given
      const urlWithParams = 'https://example.com/path?key=value&foo=bar';

      // when
      const url = Url.create(urlWithParams);

      // then
      expect(url).toBeInstanceOf(Url);
      expect(url.value).toBe(urlWithParams);
    });
  });

  describe('unsafeCreate', () => {
    it('유효성 검사 없이 URL 객체를 생성한다.', () => {
      // given
      const invalidUrl = 'not-a-valid-url';

      // when
      const url = Url.unsafeCreate(invalidUrl);

      // then
      expect(url).toBeInstanceOf(Url);
      expect(url.value).toBe(invalidUrl);
    });
  });
});
