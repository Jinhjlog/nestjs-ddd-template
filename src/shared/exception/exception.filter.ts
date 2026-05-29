import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Inject,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { BaseException } from './base.exception';
import { requestContext } from '../../module/core/logger/request-context';

interface ErrorResponse {
  statusCode: number;
  errorCode: string;
  timestamp: Date;
  path: string;
  method: string;
  message: string;
  requestId: string;
  errors?: Record<string, string[]>;
}

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: Logger,
  ) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();
    const req = ctx.getRequest<Request>();
    const requestId = requestContext.getRequestId();

    const errorResponse = this.createErrorResponse(exception, {
      url: req.url,
      method: req.method,
      requestId,
    });

    this.logError(errorResponse, exception, requestId);
    res.status(errorResponse.statusCode).json(errorResponse);
  }

  private createErrorResponse(
    exception: unknown,
    requestInfo: { url: string; method: string; requestId: string },
  ): ErrorResponse {
    const timestamp = new Date();
    const { url: path, method, requestId } = requestInfo;

    if (exception instanceof BaseException) {
      return {
        statusCode: exception.statusCode,
        errorCode: exception.errorCode,
        message: exception.message,
        timestamp,
        path,
        method,
        requestId,
      };
    }

    if (exception instanceof HttpException) {
      const status = exception.getStatus();

      return {
        statusCode: status,
        errorCode: `HTTP_${status}`,
        message: exception.message,
        timestamp,
        path,
        method,
        requestId,
      };
    }

    return {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      errorCode: 'INTERNAL_SERVER_ERROR',
      message: 'UNKNOWN ERROR',
      timestamp,
      path,
      method,
      requestId,
    };
  }

  private logError(
    errorResponse: ErrorResponse,
    exception: unknown,
    requestId: string,
  ): void {
    const stack = exception instanceof Error ? exception.stack : undefined;
    const logData = {
      context: 'AllExceptionsFilter',
      requestId,
      error: errorResponse,
      stack,
    };

    if (errorResponse.statusCode >= 500) {
      this.logger.error(logData);
    } else {
      this.logger.warn(logData);
    }
  }
}
