import { ValueObjectValidationException } from '@shared/exception';
import { Password, PasswordError } from './password';

describe('password', () => {
  describe('유효성 검사', () => {
    it('비밀번호는 8자 이상 입력되어야 합니다.', async () => {
      // given
      const password = '!1234';

      // when & then
      await expect(Password.create(password)).rejects.toThrow(
        new ValueObjectValidationException({
          entityName: Password.name,
          reason: PasswordError.TooShortPassword,
          errorCode: 'PASSWORD_TOO_SHORT',
        }),
      );
    });

    it('비밀번호는 25자 이하로 입력되어야 합니다.', async () => {
      // given
      const password = '!1234567890123456789012345';

      // when & then
      await expect(Password.create(password)).rejects.toThrow(
        new ValueObjectValidationException({
          entityName: Password.name,
          reason: PasswordError.TooLongPassword,
          errorCode: 'PASSWORD_TOO_LONG',
        }),
      );
    });

    it('비밀번호는 특수문자를 1개 이상 포함해야 합니다.', async () => {
      // given
      const password = 'test1234';

      // when & then
      await expect(Password.create(password)).rejects.toThrow(
        new ValueObjectValidationException({
          entityName: Password.name,
          reason: PasswordError.MissingSpecialCharacter,
          errorCode: 'PASSWORD_MISSING_SPECIAL_CHARACTER',
        }),
      );
    });
  });

  describe('create', () => {
    it('비밀번호 객체를 생성합니다.', async () => {
      // given
      const password = 'test!123';

      // when
      const passwordObject = await Password.create(password);

      // then
      expect(passwordObject).toBeInstanceOf(Password);
      expect(passwordObject.props.hashed).toBe(false);
    });

    it('해시된 비밀번호 객체를 생성합니다.', async () => {
      // given
      const password = 'test!123';

      // when
      const passwordObject = await Password.create(password, true);

      // then
      expect(passwordObject).toBeInstanceOf(Password);
      expect(passwordObject.props.hashed).toBe(true);
      expect(passwordObject.props.value).not.toBe(password);
    });
  });

  describe('comparePassword', () => {
    it('비밀번호가 일치하는지 확인합니다.', async () => {
      // given
      const rawPassword = 'test!123';
      const hashedPassword = await Password.create(rawPassword, true);
      const inputPassword = await Password.create(rawPassword, false);

      // when
      const isMatch = await hashedPassword.comparePassword(inputPassword);

      // then
      expect(isMatch).toBe(true);
    });

    it('비밀번호가 일치하지 않으면 false를 반환합니다.', async () => {
      // given
      const rawPassword = 'test!123';
      const wrongPassword = 'wrong!123';
      const hashedPassword = await Password.create(rawPassword, true);
      const inputPassword = await Password.create(wrongPassword, false);

      // when
      const isMatch = await hashedPassword.comparePassword(inputPassword);

      // then
      expect(isMatch).toBe(false);
    });

    it('저장된 비밀번호가 해시되지 않았으면 예외를 발생시킵니다.', async () => {
      // given
      const plainPassword = await Password.create('test!123', false);
      const inputPassword = await Password.create('test!123', false);

      // when & then
      await expect(
        plainPassword.comparePassword(inputPassword),
      ).rejects.toThrow(
        new ValueObjectValidationException({
          entityName: Password.name,
          reason: PasswordError.InvalidPasswordComparison,
          errorCode: 'INVALID_PASSWORD_COMPARISON',
        }),
      );
    });

    it('입력받은 비밀번호가 해시되어 있으면 예외를 발생시킵니다.', async () => {
      // given
      const hashedPassword = await Password.create('test!123', true);
      const hashedInput = await Password.create('test!123', true);

      // when & then
      await expect(hashedPassword.comparePassword(hashedInput)).rejects.toThrow(
        new ValueObjectValidationException({
          entityName: Password.name,
          reason: PasswordError.InvalidPasswordComparison,
          errorCode: 'INVALID_PASSWORD_COMPARISON',
        }),
      );
    });

    it('Password 객체끼리 비교합니다 (통합 시나리오)', async () => {
      // given: 사용자 가입 시나리오
      const signupPassword = 'test!123';
      const storedPassword = await Password.create(signupPassword, true); // DB에 저장된 해시

      // when: 로그인 시나리오
      const loginPassword = await Password.create(signupPassword, false); // 사용자 입력
      const isAuthenticated =
        await storedPassword.comparePassword(loginPassword);

      // then
      expect(isAuthenticated).toBe(true);
      expect(storedPassword.props.hashed).toBe(true);
      expect(loginPassword.props.hashed).toBe(false);
    });
  });

  describe('hashPassword', () => {
    it('평문 비밀번호를 해시합니다.', async () => {
      // given
      const password = 'test!123';
      const passwordObject = await Password.create(password, false);

      // when
      const hashedPasswordObject = await passwordObject.hashPassword();

      // then
      expect(hashedPasswordObject.props.hashed).toBe(true);
      expect(hashedPasswordObject.props.value).not.toBe(password);
    });

    it('이미 해시된 비밀번호는 그대로 반환합니다.', async () => {
      // given
      const password = 'test!123';
      const hashedPasswordObject = await Password.create(password, true);
      const originalHash = hashedPasswordObject.props.value;

      // when
      const result = await hashedPasswordObject.hashPassword();

      // then
      expect(result.props.value).toBe(originalHash);
      expect(result.props.hashed).toBe(true);
    });
  });
});
