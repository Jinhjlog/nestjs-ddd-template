import { ValueObjectValidationException } from '@shared/exception';
import { Phone, PhoneError } from './phone';

describe('Phone', () => {
  describe('유효성 검사', () => {
    it('문자가 포함된 전화번호는 예외가 발생합니다', () => {
      expect(() => Phone.create('010123456a')).toThrow(
        new ValueObjectValidationException({
          detail: PhoneError.InvalidPhone,
          code: 'INVALID_PHONE',
        }),
      );
    });

    it('정규화 후 길이가 부족하면 예외가 발생합니다', () => {
      expect(() => Phone.create('123456789')).toThrow(
        new ValueObjectValidationException({
          detail: PhoneError.InvalidPhone,
          code: 'INVALID_PHONE',
        }),
      );
    });

    it('정규화 후 길이가 초과하면 예외가 발생합니다', () => {
      expect(() => Phone.create('123456789012')).toThrow(
        new ValueObjectValidationException({
          detail: PhoneError.InvalidPhone,
          code: 'INVALID_PHONE',
        }),
      );
    });
  });

  describe('정규화', () => {
    it('하이픈이 포함된 전화번호를 정규화합니다', () => {
      const phone = Phone.create('010-1234-5678');

      expect(phone.value).toBe('01012345678');
    });

    it('공백이 포함된 전화번호를 정규화합니다', () => {
      const phone = Phone.create('010 1234 5678');

      expect(phone.value).toBe('01012345678');
    });

    it('+82 국가코드를 0으로 변환합니다', () => {
      const phone = Phone.create('+82 10 1234 5678');

      expect(phone.value).toBe('01012345678');
    });

    it('+82 국가코드와 하이픈 조합을 정규화합니다', () => {
      const phone = Phone.create('+82-10-1234-5678');

      expect(phone.value).toBe('01012345678');
    });

    it('불규칙한 공백이 포함된 전화번호를 정규화합니다', () => {
      const phone = Phone.create('0101234 1234');

      expect(phone.value).toBe('01012341234');
    });

    it('82 국가코드(+없이)를 0으로 변환합니다', () => {
      const phone = Phone.create('821012345678');

      expect(phone.value).toBe('01012345678');
    });
  });

  describe('create', () => {
    it('10자리 전화번호로 Phone 객체를 생성합니다', () => {
      const phone = Phone.create('0212345678');

      expect(phone).toBeInstanceOf(Phone);
      expect(phone.value).toBe('0212345678');
    });

    it('11자리 휴대폰 번호로 Phone 객체를 생성합니다', () => {
      const phone = Phone.create('01012345678');

      expect(phone).toBeInstanceOf(Phone);
      expect(phone.value).toBe('01012345678');
    });
  });
});
