export type BaseExceptionType = {
  statusCode: number;
  errorCode: string;
  message: string;
};

export class BaseException extends Error {
  statusCode: number;
  errorCode: string;

  constructor({ statusCode, message, errorCode }: BaseExceptionType) {
    super(message);
    this.statusCode = statusCode;
    this.errorCode = errorCode;
  }
}
