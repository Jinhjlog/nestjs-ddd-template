export enum AuthResultStatus {
  SUCCESS = 'SUCCESS',

  ACCESS_TOKEN_EXPIRED = 'ACCESS_TOKEN_EXPIRED',
  INVALID_ACCESS_TOKEN = 'INVALID_ACCESS_TOKEN',

  INFRASTRUCTURE_ERROR = 'INFRASTRUCTURE_ERROR',
}

export type CreateAccessTokenErrorStatus =
  AuthResultStatus.INFRASTRUCTURE_ERROR;

export type VerifyAccessTokenErrorStatus =
  | AuthResultStatus.ACCESS_TOKEN_EXPIRED
  | AuthResultStatus.INVALID_ACCESS_TOKEN
  | AuthResultStatus.INFRASTRUCTURE_ERROR;
