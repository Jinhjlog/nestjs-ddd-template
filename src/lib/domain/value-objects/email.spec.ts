import { ValueObjectValidationException } from '@shared/exception';
import { Email, EmailError } from './email';

describe('email', () => {
  describe('유효성 검사', () => {
    it('이메일 형식이 올바르지 않습니다.', () => {
      // given
      const email = 'test111com';

      // when & then;
      expect(() => Email.create(email)).toThrow(
        new ValueObjectValidationException({
          entityName: Email.name,
          reason: EmailError.InvalidEmail,
          errorCode: 'INVALID_EMAIL_FORMAT',
        }),
      );
    });
  });

  describe('create', () => {
    it('이메일 객체를 생성합니다.', () => {
      // given
      const email = 'test@gmail.com';

      // when
      const emailObject = Email.create(email);

      // then
      expect(emailObject).toBeInstanceOf(Email);
    });
  });
});
