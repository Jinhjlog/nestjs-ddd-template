import { ValueObject } from '@lib/domain';
import { ValueObjectValidationException } from '@shared/exception';

export const CoordinateError = {
  INVALID_LATITUDE_FORMAT:
    '위도는 유효한 문자열로 이루어진 숫자여야 합니다 (소수점 6~8자리)',
  INVALID_LONGITUDE_FORMAT:
    '경도는 유효한 문자열로 이루어진 숫자여야 합니다 (소수점 6~8자리)',
  LATITUDE_OUT_OF_RANGE: '위도는 -90 ~ 90 사이여야 합니다',
  LONGITUDE_OUT_OF_RANGE: '경도는 -180 ~ 180 사이여야 합니다',
} as const;

export type CoordinateErrorType =
  (typeof CoordinateError)[keyof typeof CoordinateError];

export interface CoordinateProps {
  latitude: string; // 위도
  longitude: string; // 경도
  updatedAt: Date; // 좌표 정보가 수집된 시간
}

export class Coordinate extends ValueObject<CoordinateProps> {
  private static readonly LATITUDE_MIN = -90;
  private static readonly LATITUDE_MAX = 90;
  private static readonly LONGITUDE_MIN = -180;
  private static readonly LONGITUDE_MAX = 180;

  private constructor(props: CoordinateProps) {
    super(props);
  }

  get latitude(): string {
    return this.props.latitude;
  }

  get longitude(): string {
    return this.props.longitude;
  }

  get updatedAt(): Date {
    return this.props.updatedAt;
  }

  private static isValidCoordinateFormat(coordinate: string): boolean {
    const coordinateRegex = /^-?\d{1,3}\.\d{6,8}$/;
    return coordinateRegex.test(coordinate);
  }

  static create(props: { latitude: string; longitude: string }): Coordinate {
    // 위도 형식 검증 (소수점 6~8자리)
    if (!this.isValidCoordinateFormat(props.latitude)) {
      throw new ValueObjectValidationException({
        detail: CoordinateError.INVALID_LATITUDE_FORMAT,
        code: 'LATITUDE_FORMAT_INVALID',
      });
    }

    // 경도 형식 검증 (소수점 6~8자리)
    if (!this.isValidCoordinateFormat(props.longitude)) {
      throw new ValueObjectValidationException({
        detail: CoordinateError.INVALID_LONGITUDE_FORMAT,
        code: 'LONGITUDE_FORMAT_INVALID',
      });
    }

    // 위도 범위 검증 (-90 ~ 90)
    const latitudeValue = parseFloat(props.latitude);
    if (
      latitudeValue < this.LATITUDE_MIN ||
      latitudeValue > this.LATITUDE_MAX
    ) {
      throw new ValueObjectValidationException({
        detail: CoordinateError.LATITUDE_OUT_OF_RANGE,
        code: 'LATITUDE_OUT_OF_RANGE',
      });
    }

    // 경도 범위 검증 (-180 ~ 180)
    const longitudeValue = parseFloat(props.longitude);
    if (
      longitudeValue < this.LONGITUDE_MIN ||
      longitudeValue > this.LONGITUDE_MAX
    ) {
      throw new ValueObjectValidationException({
        detail: CoordinateError.LONGITUDE_OUT_OF_RANGE,
        code: 'LONGITUDE_OUT_OF_RANGE',
      });
    }

    return new Coordinate({
      latitude: props.latitude,
      longitude: props.longitude,
      updatedAt: new Date(),
    });
  }

  static unsafeCreate(props: CoordinateProps): Coordinate {
    return new Coordinate(props);
  }
}
