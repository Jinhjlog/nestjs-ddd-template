import { ConcurrentUpdateException } from '@shared/exception';

/**
 * Logger 인터페이스. NestJS Logger 또는 custom logger 주입 가능.
 */
export interface IRetryLogger {
  warn(message: string, context?: string): void;
  error(message: string, error?: unknown, context?: string): void;
}

/**
 * 재시도 옵션.
 *
 * @property maxAttempts 최대 시도 횟수 (기본 3)
 * @property baseDelayMs 초기 지연(ms) (기본 50)
 * @property maxDelayMs 지연 상한(ms)
 * @property jitter 지터 적용 여부 (기본 false)
 * @property random 지터 계산용 난수 함수
 * @property shouldRetry 재시도 여부를 결정하는 함수
 * @property onRetry 재시도 직전 호출되는 훅
 * @property logger 로거 (onRetry 실패 시 로깅)
 */
export type RetryOptions = {
  /** 최대 시도 횟수 */
  maxAttempts?: number;
  /** 초기 지연(ms) */
  baseDelayMs?: number;
  /** 지연 상한(ms) */
  maxDelayMs?: number;
  /** 지터 적용 여부 */
  jitter?: boolean;
  /** 지터 계산용 난수 함수 */
  random?: () => number;
  /** 재시도 여부를 결정하는 함수 */
  shouldRetry?: (error: unknown) => boolean;
  /** 재시도 직전 호출되는 훅 */
  onRetry?: (info: RetryInfo) => void | Promise<void>;
  /** 로거 (onRetry 실패 로깅) */
  logger?: IRetryLogger;
};

/**
 * onRetry 훅에 전달되는 재시도 정보.
 */
export type RetryInfo = {
  /** 현재 시도 횟수 (0부터 시작) */
  attempt: number;
  /** 실패 원인 */
  error: unknown;
  /** 이번 재시도까지의 지연(ms) */
  delayMs: number;
};

/**
 * 기본 재시도 조건: 낙관적 락 충돌만 재시도합니다.
 */
const defaultShouldRetry = (error: unknown): boolean => {
  return error instanceof ConcurrentUpdateException;
};

/**
 * 지정된 시간(ms) 만큼 대기합니다.
 */
const sleep = (ms: number): Promise<void> => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};

/**
 * 지수 백오프를 계산합니다. 필요 시 최대 지연을 상한으로 둡니다.
 */
const calculateDelay = (
  attempt: number,
  options: Required<Pick<RetryOptions, 'baseDelayMs' | 'maxDelayMs'>>,
): number => {
  const delay = options.baseDelayMs * Math.pow(2, attempt);
  return Math.min(delay, options.maxDelayMs);
};

/**
 * 비동기 작업을 백오프와 함께 재시도합니다.
 *
 * @param operation 시도마다 실행할 작업 (attempt는 0부터 시작)
 * @param options 재시도 옵션
 */
export const retry = async <T>(
  operation: (attempt: number) => Promise<T>,
  options: RetryOptions = {},
): Promise<T> => {
  const maxAttempts = options.maxAttempts ?? 3;
  const baseDelayMs = options.baseDelayMs ?? 50;
  const maxDelayMs = options.maxDelayMs ?? Number.POSITIVE_INFINITY;
  const random = options.random ?? Math.random;
  const shouldRetry = options.shouldRetry ?? defaultShouldRetry;

  if (maxAttempts <= 0) {
    throw new Error('최대 시도 횟수는 0보다 커야 합니다.');
  }
  if (baseDelayMs < 0 || maxDelayMs < 0) {
    throw new Error('지연 시간은 0 이상이어야 합니다.');
  }

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      return await operation(attempt);
    } catch (error) {
      const canRetry = shouldRetry(error);
      const isLastAttempt = attempt >= maxAttempts - 1;

      if (!canRetry || isLastAttempt) {
        throw error;
      }

      let delayMs = calculateDelay(attempt, { baseDelayMs, maxDelayMs });

      if (options.jitter) {
        const jitterMultiplier = 0.5 + random();
        delayMs = Math.floor(delayMs * jitterMultiplier);
      }

      if (options.onRetry) {
        try {
          await options.onRetry({ attempt, error, delayMs });
        } catch (hookError) {
          // onRetry 훅 실패는 재시도를 막지 않음
          if (options.logger) {
            options.logger.error(
              `onRetry 훅 실패: 재시도를 계속합니다. (시도: ${attempt}, 지연: ${delayMs}ms)`,
              hookError,
              'retry',
            );
          }
        }
      }

      if (delayMs > 0) {
        await sleep(delayMs);
      }
    }
  }

  throw new Error('재시도: 최대 시도 횟수를 초과했습니다.');
};
