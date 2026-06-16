/* eslint-disable @typescript-eslint/no-unsafe-argument */
import {
  DomainRuleViolationException,
  ValueObjectValidationException,
} from '@shared/exception';
import { PositiveNumber } from './positive-number';

describe('PositiveNumber', () => {
  describe('유효성 검사', () => {
    it('null 값은 허용되지 않습니다.', () => {
      // given
      const invalidValue = null;

      // when & then
      expect(() =>
        PositiveNumber.create(invalidValue as any, { fieldName: '가격' }),
      ).toThrow(
        new ValueObjectValidationException({
          detail: '필수 값입니다',
          code: '가격_REQUIRED',
        }),
      );
    });

    it('undefined 값은 허용되지 않습니다.', () => {
      // given
      const invalidValue = undefined;

      // when & then
      expect(() =>
        PositiveNumber.create(invalidValue as any, { fieldName: '가격' }),
      ).toThrow(
        new ValueObjectValidationException({
          detail: '필수 값입니다',
          code: '가격_REQUIRED',
        }),
      );
    });

    it('문자열은 허용되지 않습니다.', () => {
      // given
      const invalidValue = 'invalid';

      // when & then
      expect(() =>
        PositiveNumber.create(invalidValue as any, { fieldName: '가격' }),
      ).toThrow(
        new ValueObjectValidationException({
          detail: '유효한 숫자여야 합니다',
          code: '가격_INVALID',
        }),
      );
    });

    it('NaN은 허용되지 않습니다.', () => {
      // given
      const invalidValue = NaN;

      // when & then
      expect(() =>
        PositiveNumber.create(invalidValue, { fieldName: '가격' }),
      ).toThrow(
        new ValueObjectValidationException({
          detail: '유효한 숫자여야 합니다',
          code: '가격_INVALID',
        }),
      );
    });

    it('Infinity는 허용되지 않습니다.', () => {
      // given
      const value = Infinity;

      // when & then
      expect(() => PositiveNumber.create(value, { fieldName: '재고' })).toThrow(
        new ValueObjectValidationException({
          detail: '유효한 숫자여야 합니다',
          code: '재고_INVALID',
        }),
      );
    });

    it('음수는 허용되지 않습니다.', () => {
      // given
      const value = -10;

      // when & then
      expect(() => PositiveNumber.create(value, { fieldName: '재고' })).toThrow(
        new ValueObjectValidationException({
          detail: '음수는 허용되지 않습니다',
          code: '재고_NEGATIVE',
        }),
      );
    });

    it('allowZero가 false일 때 0은 허용되지 않습니다.', () => {
      // given
      const value = 0;

      // when & then
      expect(() =>
        PositiveNumber.create(value, {
          fieldName: '재고',
          allowZero: false,
        }),
      ).toThrow(
        new ValueObjectValidationException({
          detail: '0은 허용되지 않습니다',
          code: '재고_ZERO_NOT_ALLOWED',
        }),
      );
    });

    it('최대값을 초과하면 허용되지 않습니다.', () => {
      // given
      const value = 1000;
      const maxValue = 500;

      // when & then
      expect(() =>
        PositiveNumber.create(value, {
          fieldName: '할인가격',
          maxValue,
        }),
      ).toThrow(
        new ValueObjectValidationException({
          detail: `최대값 ${maxValue}을 초과할 수 없습니다`,
          code: '할인가격_TOO_LARGE',
        }),
      );
    });

    it('allowDecimal이 false일 때 소수점은 허용되지 않습니다.', () => {
      // given
      const value = 10.5;

      // when & then
      expect(() =>
        PositiveNumber.create(value, {
          fieldName: '재고',
          allowDecimal: false,
        }),
      ).toThrow(
        new ValueObjectValidationException({
          detail: '소수점은 허용되지 않습니다',
          code: '재고_DECIMAL_NOT_ALLOWED',
        }),
      );
    });

    it('camelCase 필드명이 올바른 에러 코드로 변환됩니다.', () => {
      // given
      const value = -1;

      // when & then
      expect(() =>
        PositiveNumber.create(value, { fieldName: 'discountPrice' }),
      ).toThrow(
        new ValueObjectValidationException({
          detail: '음수는 허용되지 않습니다',
          code: 'DISCOUNT_PRICE_NEGATIVE',
        }),
      );
    });
  });

  describe('create', () => {
    it('유효한 양수로 객체를 생성합니다.', () => {
      // given
      const value = 100;

      // when
      const positiveNumber = PositiveNumber.create(value, {
        fieldName: '가격',
      });

      // then
      expect(positiveNumber).toBeInstanceOf(PositiveNumber);
      expect(positiveNumber.value).toBe(100);
    });

    it('0을 허용하여 객체를 생성합니다.', () => {
      // given
      const value = 0;

      // when
      const positiveNumber = PositiveNumber.create(value, {
        fieldName: '가격',
        allowZero: true,
      });

      // then
      expect(positiveNumber).toBeInstanceOf(PositiveNumber);
      expect(positiveNumber.value).toBe(0);
    });

    it('소수점을 허용하여 객체를 생성합니다.', () => {
      // given
      const value = 99.99;

      // when
      const positiveNumber = PositiveNumber.create(value, {
        fieldName: '가격',
        allowDecimal: true,
      });

      // then
      expect(positiveNumber).toBeInstanceOf(PositiveNumber);
      expect(positiveNumber.value).toBe(99.99);
    });

    it('정수만 허용하여 객체를 생성합니다.', () => {
      // given
      const value = 100;

      // when
      const positiveNumber = PositiveNumber.create(value, {
        fieldName: '재고',
        allowDecimal: false,
      });

      // then
      expect(positiveNumber).toBeInstanceOf(PositiveNumber);
      expect(positiveNumber.value).toBe(100);
    });
  });

  describe('unsafeCreate', () => {
    it('검증 없이 객체를 생성합니다.', () => {
      // given
      const value = -100;

      // when
      const positiveNumber = PositiveNumber.unsafeCreate(value, '가격');

      // then
      expect(positiveNumber).toBeInstanceOf(PositiveNumber);
      expect(positiveNumber.value).toBe(-100);
    });
  });

  describe('수학 연산', () => {
    it('두 PositiveNumber를 더합니다.', () => {
      // given
      const num1 = PositiveNumber.create(10, { fieldName: '가격' });
      const num2 = PositiveNumber.create(20, { fieldName: '가격' });

      // when
      const result = num1.add(num2);

      // then
      expect(result.value).toBe(30);
    });

    it('두 PositiveNumber를 뺍니다.', () => {
      // given
      const num1 = PositiveNumber.create(30, { fieldName: '가격' });
      const num2 = PositiveNumber.create(10, { fieldName: '가격' });

      // when
      const result = num1.subtract(num2);

      // then
      expect(result.value).toBe(20);
    });

    it('뺄셈 결과가 음수가 되면 에러를 발생시킵니다.', () => {
      // given
      const num1 = PositiveNumber.create(10, { fieldName: '가격' });
      const num2 = PositiveNumber.create(20, { fieldName: '가격' });

      // when & then
      expect(() => num1.subtract(num2)).toThrow(
        new DomainRuleViolationException({
          entityName: '가격',
          reason: '가격는 음수가 될 수 없습니다',
          errorCode: '가격_NEGATIVE',
        }),
      );
    });

    it('두 PositiveNumber를 곱합니다.', () => {
      // given
      const num1 = PositiveNumber.create(10, { fieldName: '가격' });
      const num2 = PositiveNumber.create(3, { fieldName: '수량' });

      // when
      const result = num1.multiply(num2);

      // then
      expect(result.value).toBe(30);
    });

    it('두 PositiveNumber를 나눕니다.', () => {
      // given
      const num1 = PositiveNumber.create(30, { fieldName: '가격' });
      const num2 = PositiveNumber.create(3, { fieldName: '수량' });

      // when
      const result = num1.divide(num2);

      // then
      expect(result.value).toBe(10);
    });

    it('0으로 나누면 에러를 발생시킵니다.', () => {
      // given
      const num1 = PositiveNumber.create(30, { fieldName: '가격' });
      const num2 = PositiveNumber.create(0, {
        fieldName: '수량',
        allowZero: true,
      });

      // when & then
      expect(() => num1.divide(num2)).toThrow(
        new DomainRuleViolationException({
          entityName: '가격',
          reason: '가격는 0으로 나눌 수 없습니다',
          errorCode: '가격_DIVIDE_BY_ZERO',
        }),
      );
    });
  });

  describe('비교 연산', () => {
    it('다른 PositiveNumber보다 큰지 확인합니다.', () => {
      // given
      const num1 = PositiveNumber.create(20, { fieldName: '가격' });
      const num2 = PositiveNumber.create(10, { fieldName: '가격' });

      // when
      const result = num1.isGreaterThan(num2);

      // then
      expect(result).toBe(true);
    });

    it('다른 PositiveNumber보다 작은지 확인합니다.', () => {
      // given
      const num1 = PositiveNumber.create(10, { fieldName: '가격' });
      const num2 = PositiveNumber.create(20, { fieldName: '가격' });

      // when
      const result = num1.isLessThan(num2);

      // then
      expect(result).toBe(true);
    });

    it('다른 PositiveNumber와 같은지 확인합니다.', () => {
      // given
      const num1 = PositiveNumber.create(10, { fieldName: '가격' });
      const num2 = PositiveNumber.create(10, { fieldName: '가격' });

      // when
      const result = num1.equals(num2);

      // then
      expect(result).toBe(true);
    });
  });
});
