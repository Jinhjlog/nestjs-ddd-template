import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Inject,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { STATUS_CODES } from 'http';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { BaseException, FieldError } from './base.exception';
import { ErrorCategory } from './error-category';
import { requestContext } from '../../module/core/logger/request-context';

/** 에러 카테고리 → HTTP 상태코드 (HTTP 지식은 이 어댑터에만 존재) */
const CATEGORY_STATUS: Record<ErrorCategory, number> = {
  [ErrorCategory.VALIDATION]: HttpStatus.BAD_REQUEST,
  [ErrorCategory.UNAUTHENTICATED]: HttpStatus.UNAUTHORIZED,
  [ErrorCategory.FORBIDDEN]: HttpStatus.FORBIDDEN,
  [ErrorCategory.NOT_FOUND]: HttpStatus.NOT_FOUND,
  [ErrorCategory.CONFLICT]: HttpStatus.CONFLICT,
  [ErrorCategory.RULE_VIOLATION]: HttpStatus.UNPROCESSABLE_ENTITY,
  [ErrorCategory.INTERNAL]: HttpStatus.INTERNAL_SERVER_ERROR,
  [ErrorCategory.UNAVAILABLE]: HttpStatus.SERVICE_UNAVAILABLE,
};

/** RFC 9457 Problem Details (+ 확장 멤버 code/errors/requestId/timestamp) */
interface ProblemDetails {
  type: string;
  title: string;
  status: number;
  detail: string;
  instance: string;
  code: string;
  errors?: FieldError[];
  requestId: string;
  timestamp: string;
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

    const problem = this.toProblem(exception, {
      instance: req.url,
      requestId: requestContext.getRequestId(),
    });

    this.logError(problem, exception);

    res.setHeader('Content-Type', 'application/problem+json');
    res.status(problem.status).json(problem);
  }

  private toProblem(
    exception: unknown,
    ctx: { instance: string; requestId: string },
  ): ProblemDetails {
    const common = {
      type: 'about:blank',
      instance: ctx.instance,
      requestId: ctx.requestId,
      timestamp: new Date().toISOString(),
    };

    // 1) 우리 애플리케이션 예외 (category로 HTTP 매핑)
    //    - 단건 예외(VO 검증·NotFound·Rule 등): code + detail
    //    - 다건 검증(RequestValidationException): errors[] 동반 (DTO 배치 검증)
    if (exception instanceof BaseException) {
      const status =
        CATEGORY_STATUS[exception.category] ?? HttpStatus.INTERNAL_SERVER_ERROR;
      return {
        ...common,
        title: STATUS_CODES[status] ?? 'Error',
        status,
        code: exception.code,
        detail: exception.message,
        ...(exception.errors ? { errors: exception.errors } : {}),
      };
    }

    // 2) NestJS 내장 HttpException (라우트 미존재 등)
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      return {
        ...common,
        title: STATUS_CODES[status] ?? 'Error',
        status,
        code: `HTTP_${status}`,
        detail: exception.message,
      };
    }

    // 3) 미처리 예외
    const status = HttpStatus.INTERNAL_SERVER_ERROR;
    return {
      ...common,
      title: STATUS_CODES[status] ?? 'Internal Server Error',
      status,
      code: 'INTERNAL_SERVER_ERROR',
      detail: '예상치 못한 오류가 발생했습니다.',
    };
  }

  private logError(problem: ProblemDetails, exception: unknown): void {
    const stack = exception instanceof Error ? exception.stack : undefined;
    const logData = {
      context: 'AllExceptionsFilter',
      requestId: problem.requestId,
      error: problem,
      stack,
    };

    if (problem.status >= 500) {
      this.logger.error(logData);
    } else {
      this.logger.warn(logData);
    }
  }
}
