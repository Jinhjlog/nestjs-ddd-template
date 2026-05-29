import { Inject, Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { Logger } from 'winston';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { requestContext } from './request-context';
import {
  maskAuthorizationHeader,
  maskSensitiveData,
} from './sensitive-data.util';

const MAX_BODY_SIZE = 100 * 1024; // 100KB

@Injectable()
export class LoggerMiddleware implements NestMiddleware {
  constructor(
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
  ) {}

  use(req: Request, res: Response, next: NextFunction): void {
    const requestId = requestContext.generateRequestId();
    const startTime = Date.now();

    requestContext.run(
      {
        requestId,
        method: req.method,
        path: req.originalUrl,
        startTime,
      },
      () => {
        this.logRequest(req, requestId);

        res.on('finish', () => {
          this.logResponse(req, res, requestId, startTime);
        });

        next();
      },
    );
  }

  private logRequest(req: Request, requestId: string): void {
    const body: unknown = req.body;
    const logData = {
      type: 'REQUEST',
      requestId,
      method: req.method,
      path: req.originalUrl,
      query: Object.keys(req.query).length > 0 ? req.query : undefined,
      body: this.shouldLogBody(req) ? maskSensitiveData(body) : undefined,
      headers: maskAuthorizationHeader({
        'user-agent': req.headers['user-agent'],
        'content-type': req.headers['content-type'],
        authorization: req.headers.authorization,
      }),
      ip: (() => {
        const forwarded = req.headers['x-forwarded-for'];
        return typeof forwarded === 'string'
          ? forwarded.split(',')[0].trim()
          : req.ip || '';
      })(),
    };

    this.logger.info({ message: 'HTTP Request', ...logData });
  }

  private logResponse(
    req: Request,
    res: Response,
    requestId: string,
    startTime: number,
  ): void {
    const duration = Date.now() - startTime;
    const logData = {
      type: 'RESPONSE',
      requestId,
      method: req.method,
      path: req.originalUrl,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      contentLength: res.get('content-length'),
    };

    const message = `${req.method} ${req.originalUrl} ${res.statusCode} ${duration}ms`;

    if (res.statusCode >= 500) {
      this.logger.error({ message, ...logData });
    } else if (res.statusCode >= 400) {
      this.logger.warn({ message, ...logData });
    } else {
      this.logger.info({ message, ...logData });
    }
  }

  private shouldLogBody(req: Request): boolean {
    const contentType = req.headers['content-type'] || '';
    if (contentType.includes('multipart/form-data')) {
      return false;
    }

    // Content-Length가 100KB 초과하면 로깅하지 않음
    const contentLength = parseInt(req.headers['content-length'] || '0', 10);
    if (contentLength > MAX_BODY_SIZE) {
      return false;
    }

    return ['POST', 'PUT', 'PATCH'].includes(req.method);
  }
}
