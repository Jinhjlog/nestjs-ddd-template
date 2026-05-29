import { AuthResultStatus } from './error-status';

export interface AuthResultSuccess<T> {
  status: AuthResultStatus.SUCCESS;
  data: T;
}

export interface AuthResultVoidSuccess {
  status: AuthResultStatus.SUCCESS;
}

export interface AuthResultFailure<
  E extends Exclude<AuthResultStatus, AuthResultStatus.SUCCESS>,
> {
  status: E;
  message: string;
}

export type AuthResult<
  T,
  E extends Exclude<AuthResultStatus, AuthResultStatus.SUCCESS>,
> = T extends void
  ? AuthResultVoidSuccess | AuthResultFailure<E>
  : AuthResultSuccess<T> | AuthResultFailure<E>;
