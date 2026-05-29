import { ValueObjectValidationException } from '@shared/exception';
import { Coordinate, CoordinateError } from './coordinate';

describe('Coordinate', () => {
  describe('create', () => {
    describe('성공 케이스', () => {
      it('유효한 위도와 경도로 객체를 생성해야 한다', () => {
        // given
        const latitude = '37.123456';
        const longitude = '126.123456';

        // when
        const coordinate = Coordinate.create({
          latitude,
          longitude,
        });

        // then
        expect(coordinate).toBeDefined();
        expect(coordinate.latitude).toBe(latitude);
        expect(coordinate.longitude).toBe(longitude);
        expect(coordinate.updatedAt).toBeInstanceOf(Date);
      });

      it('음수 좌표도 유효하게 생성해야 한다', () => {
        // given
        const latitude = '-37.123456';
        const longitude = '-126.123456';

        // when
        const coordinate = Coordinate.create({
          latitude,
          longitude,
        });

        // then
        expect(coordinate).toBeDefined();
        expect(coordinate.latitude).toBe(latitude);
        expect(coordinate.longitude).toBe(longitude);
      });

      it('경계값(최소)으로 생성해야 한다', () => {
        // given
        const latitude = '-90.000000';
        const longitude = '-180.000000';

        // when
        const coordinate = Coordinate.create({
          latitude,
          longitude,
        });

        // then
        expect(coordinate).toBeDefined();
      });

      it('경계값(최대)으로 생성해야 한다', () => {
        // given
        const latitude = '90.000000';
        const longitude = '180.000000';

        // when
        const coordinate = Coordinate.create({
          latitude,
          longitude,
        });

        // then
        expect(coordinate).toBeDefined();
      });

      it('소수점 6자리로 생성해야 한다', () => {
        // given
        const latitude = '37.123456';
        const longitude = '126.123456';

        // when
        const coordinate = Coordinate.create({
          latitude,
          longitude,
        });

        // then
        expect(coordinate).toBeDefined();
      });

      it('소수점 7자리로 생성해야 한다', () => {
        // given
        const latitude = '37.1234567';
        const longitude = '126.1234567';

        // when
        const coordinate = Coordinate.create({
          latitude,
          longitude,
        });

        // then
        expect(coordinate).toBeDefined();
      });

      it('소수점 8자리로 생성해야 한다', () => {
        // given
        const latitude = '37.12345678';
        const longitude = '126.12345678';

        // when
        const coordinate = Coordinate.create({
          latitude,
          longitude,
        });

        // then
        expect(coordinate).toBeDefined();
      });
    });

    describe('실패 케이스 - 위도 형식 검증', () => {
      it.each([
        ['소수점 없음', '37'],
        ['소수점 5자리', '37.12345'],
        ['소수점 9자리', '37.123456789'],
        ['문자 포함', '37.123abc'],
        ['한글 포함', '37.ㅁㄴㅇㅁㄴ'],
        ['특수문자 포함', '37.123@#$'],
        ['빈 문자열', ''],
        ['문자만', 'abc'],
        ['음수 기호만', '-'],
        ['소수점만', '.'],
        ['정수부 없음', '.123456'],
        ['정수부 4자리', '1234.123456'],
        ['공백 포함', ' 37.123456'],
        ['소수점 여러개', '37.123.456'],
      ])('%s (%s) 형식은 위도 검증에 실패해야 한다', (_, invalidLatitude) => {
        // when & then
        expect(() =>
          Coordinate.create({
            latitude: invalidLatitude,
            longitude: '126.123456',
          }),
        ).toThrow(ValueObjectValidationException);

        expect(() =>
          Coordinate.create({
            latitude: invalidLatitude,
            longitude: '126.123456',
          }),
        ).toThrow(CoordinateError.INVALID_LATITUDE_FORMAT);
      });

      it('위도가 -90보다 작으면 범위 벗어남 에러를 던져야 한다', () => {
        // when & then
        expect(() =>
          Coordinate.create({
            latitude: '-91.123456',
            longitude: '126.123456',
          }),
        ).toThrow(ValueObjectValidationException);

        expect(() =>
          Coordinate.create({
            latitude: '-91.123456',
            longitude: '126.123456',
          }),
        ).toThrow(CoordinateError.LATITUDE_OUT_OF_RANGE);
      });

      it('위도가 90보다 크면 범위 벗어남 에러를 던져야 한다', () => {
        // when & then
        expect(() =>
          Coordinate.create({
            latitude: '100.123456',
            longitude: '126.123456',
          }),
        ).toThrow(ValueObjectValidationException);

        expect(() =>
          Coordinate.create({
            latitude: '100.123456',
            longitude: '126.123456',
          }),
        ).toThrow(CoordinateError.LATITUDE_OUT_OF_RANGE);
      });
    });

    describe('실패 케이스 - 경도 형식 검증', () => {
      it.each([
        ['소수점 없음', '126'],
        ['소수점 5자리', '126.12345'],
        ['소수점 9자리', '126.123456789'],
        ['문자 포함', '126.123abc'],
        ['한글 포함', '126.ㅁㄴㅇㅁㄴ'],
        ['특수문자 포함', '126.123@#$'],
        ['빈 문자열', ''],
        ['문자만', 'abc'],
        ['음수 기호만', '-'],
        ['소수점만', '.'],
        ['정수부 없음', '.123456'],
        ['정수부 4자리', '1234.123456'],
        ['공백 포함', ' 126.123456'],
        ['소수점 여러개', '126.123.456'],
      ])('%s (%s) 형식은 경도 검증에 실패해야 한다', (_, invalidLongitude) => {
        // when & then
        expect(() =>
          Coordinate.create({
            latitude: '37.123456',
            longitude: invalidLongitude,
          }),
        ).toThrow(ValueObjectValidationException);

        expect(() =>
          Coordinate.create({
            latitude: '37.123456',
            longitude: invalidLongitude,
          }),
        ).toThrow(CoordinateError.INVALID_LONGITUDE_FORMAT);
      });

      it('경도가 -180보다 작으면 범위 벗어남 에러를 던져야 한다', () => {
        // when & then
        expect(() =>
          Coordinate.create({
            latitude: '37.123456',
            longitude: '-181.123456',
          }),
        ).toThrow(ValueObjectValidationException);

        expect(() =>
          Coordinate.create({
            latitude: '37.123456',
            longitude: '-181.123456',
          }),
        ).toThrow(CoordinateError.LONGITUDE_OUT_OF_RANGE);
      });

      it('경도가 180보다 크면 범위 벗어남 에러를 던져야 한다', () => {
        // when & then
        expect(() =>
          Coordinate.create({
            latitude: '37.123456',
            longitude: '200.123456',
          }),
        ).toThrow(ValueObjectValidationException);

        expect(() =>
          Coordinate.create({
            latitude: '37.123456',
            longitude: '200.123456',
          }),
        ).toThrow(CoordinateError.LONGITUDE_OUT_OF_RANGE);
      });
    });
  });
});
