import { Logger } from '@nestjs/common';
import {
  AuthResultFailure,
  AuthResultStatus,
  AuthResultSuccess,
  AuthResultVoidSuccess,
} from '../interfaces';

export class JwtHelpers {
  constructor(private readonly logger: Logger) {}

  success<T>(data: T): AuthResultSuccess<T> {
    return { status: AuthResultStatus.SUCCESS, data };
  }

  successVoid(): AuthResultVoidSuccess {
    return { status: AuthResultStatus.SUCCESS };
  }

  failure<E extends Exclude<AuthResultStatus, AuthResultStatus.SUCCESS>>(
    status: E,
    message: string,
    identifier?: string,
  ): AuthResultFailure<E> {
    this.logger.warn(
      `${status}: ${message}` +
        (identifier ? `(identifier: ${identifier})` : ''),
    );
    return { status, message };
  }

  infrastructureError(
    error: any,
    message: string,
  ): AuthResultFailure<AuthResultStatus.INFRASTRUCTURE_ERROR> {
    this.logger.error(`${message}: ${error}`);
    return { status: AuthResultStatus.INFRASTRUCTURE_ERROR, message };
  }
}
