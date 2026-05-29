/* eslint-disable @typescript-eslint/no-unsafe-argument */
import { ValueObjectValidationException } from '@shared/exception';
import { Integer } from './integer';

describe('Integer', () => {
  describe('유효성 검사', () => {
    it('null 값은 허용되지 않습니다.', () => {
      // given
      const invalidValue = null;

      // when & then
      expect(() =>
        Integer.create(invalidValue as any, { fieldName: '경험치' }),
      ).toThrow(
        new ValueObjectValidationException({
          entityName: '경험치',
          reason: '필수 값입니다',
          errorCode: '경험치_REQUIRED',
        }),
      );
    });

    it('undefined 값은 허용되지 않습니다.', () => {
      // given
      const invalidValue = undefined;

      // when & then
      expect(() =>
        Integer.create(invalidValue as any, { fieldName: '경험치' }),
      ).toThrow(
        new ValueObjectValidationException({
          entityName: '경험치',
          reason: '필수 값입니다',
          errorCode: '경험치_REQUIRED',
        }),
      );
    });

    it('문자열은 허용되지 않습니다.', () => {
      // given
      const invalidValue = 'invalid';

      // when & then
      expect(() =>
        Integer.create(invalidValue as any, { fieldName: '경험치' }),
      ).toThrow(
        new ValueObjectValidationException({
          entityName: '경험치',
          reason: '유효한 숫자여야 합니다',
          errorCode: '경험치_INVALID',
        }),
      );
    });

    it('NaN은 허용되지 않습니다.', () => {
      // given
      const invalidValue = NaN;

      // when & then
      expect(() =>
        Integer.create(invalidValue, { fieldName: '경험치' }),
      ).toThrow(
        new ValueObjectValidationException({
          entityName: '경험치',
          reason: '유효한 숫자여야 합니다',
          errorCode: '경험치_INVALID',
        }),
      );
    });

    it('Infinity는 허용되지 않습니다.', () => {
      // given
      const value = Infinity;

      // when & then
      expect(() => Integer.create(value, { fieldName: '경험치' })).toThrow(
        new ValueObjectValidationException({
          entityName: '경험치',
          reason: '유효한 숫자여야 합니다',
          errorCode: '경험치_INVALID',
        }),
      );
    });

    it('소수점은 허용되지 않습니다.', () => {
      // given
      const value = 10.5;

      // when & then
      expect(() => Integer.create(value, { fieldName: '경험치' })).toThrow(
        new ValueObjectValidationException({
          entityName: '경험치',
          reason: '정수여야 합니다',
          errorCode: '경험치_NOT_INTEGER',
        }),
      );
    });

    it('최소값보다 작으면 허용되지 않습니다.', () => {
      // given
      const value = -10;
      const minValue = -5;

      // when & then
      expect(() =>
        Integer.create(value, {
          fieldName: '경험치',
          minValue,
        }),
      ).toThrow(
        new ValueObjectValidationException({
          entityName: '경험치',
          reason: `최소값 ${minValue}보다 작을 수 없습니다`,
          errorCode: '경험치_TOO_SMALL',
        }),
      );
    });

    it('최대값을 초과하면 허용되지 않습니다.', () => {
      // given
      const value = 100;
      const maxValue = 50;

      // when & then
      expect(() =>
        Integer.create(value, {
          fieldName: '경험치',
          maxValue,
        }),
      ).toThrow(
        new ValueObjectValidationException({
          entityName: '경험치',
          reason: `최대값 ${maxValue}을 초과할 수 없습니다`,
          errorCode: '경험치_TOO_LARGE',
        }),
      );
    });

    it('camelCase 필드명이 올바른 에러 코드로 변환됩니다.', () => {
      // given
      const value = 10.5;

      // when & then
      expect(() =>
        Integer.create(value, { fieldName: 'expOnFailure' }),
      ).toThrow(
        new ValueObjectValidationException({
          entityName: 'expOnFailure',
          reason: '정수여야 합니다',
          errorCode: 'EXP_ON_FAILURE_NOT_INTEGER',
        }),
      );
    });
  });

  describe('create', () => {
    it('양수 정수로 객체를 생성합니다.', () => {
      // given
      const value = 100;

      // when
      const integer = Integer.create(value, {
        fieldName: '경험치',
      });

      // then
      expect(integer).toBeInstanceOf(Integer);
      expect(integer.value).toBe(100);
    });

    it('0으로 객체를 생성합니다.', () => {
      // given
      const value = 0;

      // when
      const integer = Integer.create(value, {
        fieldName: '경험치',
      });

      // then
      expect(integer).toBeInstanceOf(Integer);
      expect(integer.value).toBe(0);
    });

    it('음수 정수로 객체를 생성합니다.', () => {
      // given
      const value = -50;

      // when
      const integer = Integer.create(value, {
        fieldName: '경험치 변화량',
      });

      // then
      expect(integer).toBeInstanceOf(Integer);
      expect(integer.value).toBe(-50);
    });

    it('최소값과 최대값을 지정하여 객체를 생성합니다.', () => {
      // given
      const value = 100;

      // when
      const integer = Integer.create(value, {
        fieldName: '경험치',
        minValue: -100,
        maxValue: 100,
      });

      // then
      expect(integer).toBeInstanceOf(Integer);
      expect(integer.value).toBe(100);
    });
  });

  describe('unsafeCreate', () => {
    it('검증 없이 객체를 생성합니다.', () => {
      // given
      const value = 123.456;

      // when
      const integer = Integer.unsafeCreate(value, '경험치');

      // then
      expect(integer).toBeInstanceOf(Integer);
      expect(integer.value).toBe(123.456);
    });
  });

  describe('수학 연산', () => {
    it('두 Integer를 더합니다.', () => {
      // given
      const num1 = Integer.create(10, { fieldName: '경험치' });
      const num2 = Integer.create(20, { fieldName: '경험치' });

      // when
      const result = num1.add(num2);

      // then
      expect(result.value).toBe(30);
    });

    it('음수를 더하면 값이 감소합니다.', () => {
      // given
      const num1 = Integer.create(10, { fieldName: '경험치' });
      const num2 = Integer.create(-5, { fieldName: '경험치' });

      // when
      const result = num1.add(num2);

      // then
      expect(result.value).toBe(5);
    });

    it('두 Integer를 뺍니다.', () => {
      // given
      const num1 = Integer.create(30, { fieldName: '경험치' });
      const num2 = Integer.create(10, { fieldName: '경험치' });

      // when
      const result = num1.subtract(num2);

      // then
      expect(result.value).toBe(20);
    });

    it('뺄셈 결과가 음수가 될 수 있습니다.', () => {
      // given
      const num1 = Integer.create(10, { fieldName: '경험치' });
      const num2 = Integer.create(20, { fieldName: '경험치' });

      // when
      const result = num1.subtract(num2);

      // then
      expect(result.value).toBe(-10);
    });

    it('두 Integer를 곱합니다.', () => {
      // given
      const num1 = Integer.create(10, { fieldName: '경험치' });
      const num2 = Integer.create(3, { fieldName: '배수' });

      // when
      const result = num1.multiply(num2);

      // then
      expect(result.value).toBe(30);
    });

    it('음수를 곱하면 부호가 바뀝니다.', () => {
      // given
      const num1 = Integer.create(10, { fieldName: '경험치' });
      const num2 = Integer.create(-1, { fieldName: '배수' });

      // when
      const result = num1.multiply(num2);

      // then
      expect(result.value).toBe(-10);
    });

    it('두 Integer를 나눕니다 (정수 나눗셈).', () => {
      // given
      const num1 = Integer.create(30, { fieldName: '경험치' });
      const num2 = Integer.create(3, { fieldName: '나누기' });

      // when
      const result = num1.divide(num2);

      // then
      expect(result.value).toBe(10);
    });

    it('나눗셈 결과는 정수로 내림됩니다.', () => {
      // given
      const num1 = Integer.create(10, { fieldName: '경험치' });
      const num2 = Integer.create(3, { fieldName: '나누기' });

      // when
      const result = num1.divide(num2);

      // then
      expect(result.value).toBe(3);
    });

    it('0으로 나누면 에러를 발생시킵니다.', () => {
      // given
      const num1 = Integer.create(30, { fieldName: '경험치' });
      const num2 = Integer.create(0, { fieldName: '나누기' });

      // when & then
      expect(() => num1.divide(num2)).toThrow(
        new ValueObjectValidationException({
          entityName: '경험치',
          reason: '0으로 나눌 수 없습니다',
          errorCode: '경험치_DIVIDE_BY_ZERO',
        }),
      );
    });

    it('절대값을 반환합니다.', () => {
      // given
      const num = Integer.create(-10, { fieldName: '경험치' });

      // when
      const result = num.abs();

      // then
      expect(result.value).toBe(10);
    });

    it('부호를 반전합니다.', () => {
      // given
      const num = Integer.create(10, { fieldName: '경험치' });

      // when
      const result = num.negate();

      // then
      expect(result.value).toBe(-10);
    });
  });

  describe('상태 확인', () => {
    it('양수인지 확인합니다.', () => {
      // given
      const positive = Integer.create(10, { fieldName: '경험치' });
      const zero = Integer.create(0, { fieldName: '경험치' });
      const negative = Integer.create(-10, { fieldName: '경험치' });

      // when & then
      expect(positive.isPositive()).toBe(true);
      expect(zero.isPositive()).toBe(false);
      expect(negative.isPositive()).toBe(false);
    });

    it('음수인지 확인합니다.', () => {
      // given
      const positive = Integer.create(10, { fieldName: '경험치' });
      const zero = Integer.create(0, { fieldName: '경험치' });
      const negative = Integer.create(-10, { fieldName: '경험치' });

      // when & then
      expect(positive.isNegative()).toBe(false);
      expect(zero.isNegative()).toBe(false);
      expect(negative.isNegative()).toBe(true);
    });

    it('0인지 확인합니다.', () => {
      // given
      const positive = Integer.create(10, { fieldName: '경험치' });
      const zero = Integer.create(0, { fieldName: '경험치' });
      const negative = Integer.create(-10, { fieldName: '경험치' });

      // when & then
      expect(positive.isZero()).toBe(false);
      expect(zero.isZero()).toBe(true);
      expect(negative.isZero()).toBe(false);
    });
  });

  describe('비교 연산', () => {
    it('다른 Integer보다 큰지 확인합니다.', () => {
      // given
      const num1 = Integer.create(20, { fieldName: '경험치' });
      const num2 = Integer.create(10, { fieldName: '경험치' });

      // when
      const result = num1.isGreaterThan(num2);

      // then
      expect(result).toBe(true);
    });

    it('다른 Integer보다 작은지 확인합니다.', () => {
      // given
      const num1 = Integer.create(10, { fieldName: '경험치' });
      const num2 = Integer.create(20, { fieldName: '경험치' });

      // when
      const result = num1.isLessThan(num2);

      // then
      expect(result).toBe(true);
    });

    it('다른 Integer와 같은지 확인합니다.', () => {
      // given
      const num1 = Integer.create(10, { fieldName: '경험치' });
      const num2 = Integer.create(10, { fieldName: '경험치' });

      // when
      const result = num1.equals(num2);

      // then
      expect(result).toBe(true);
    });

    it('음수끼리 비교합니다.', () => {
      // given
      const num1 = Integer.create(-5, { fieldName: '경험치' });
      const num2 = Integer.create(-10, { fieldName: '경험치' });

      // when & then
      expect(num1.isGreaterThan(num2)).toBe(true);
      expect(num2.isLessThan(num1)).toBe(true);
    });
  });
});
