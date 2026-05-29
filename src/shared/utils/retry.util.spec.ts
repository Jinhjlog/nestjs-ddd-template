import { ConcurrentUpdateException } from '@shared/exception';
import { IRetryLogger, RetryInfo, retry } from './retry.util';

describe('retry', () => {
  it('첫 시도에서 성공하면 재시도하지 않습니다.', async () => {
    // given
    const operation = jest.fn().mockResolvedValue('ok');

    // when
    const result = await retry(operation);

    // then
    expect(result).toBe('ok');
    expect(operation).toHaveBeenCalledTimes(1);
  });

  it('낙관적 락 충돌 시 재시도 후 성공합니다.', async () => {
    // given
    let attempts = 0;
    const operation = jest.fn<Promise<string>, [number]>(() => {
      if (attempts < 2) {
        attempts += 1;
        return Promise.reject(
          new ConcurrentUpdateException({ entityName: 'Account' }),
        );
      }
      return Promise.resolve('success');
    });
    const onRetry = jest.fn<void | Promise<void>, [RetryInfo]>();

    // when
    const result = await retry(operation, {
      maxAttempts: 3,
      baseDelayMs: 0,
      onRetry,
    });

    // then
    expect(result).toBe('success');
    expect(operation).toHaveBeenCalledTimes(3);
    expect(onRetry).toHaveBeenCalledTimes(2);
    const [firstCall] = onRetry.mock.calls;
    const [retryInfo] = firstCall;
    expect(retryInfo.attempt).toBe(0);
    expect(retryInfo.delayMs).toBe(0);
    expect(retryInfo.error).toBeInstanceOf(ConcurrentUpdateException);
  });

  it('재시도 대상이 아니면 즉시 예외를 던집니다.', async () => {
    // given
    const operation = jest.fn<Promise<never>, [number]>(() =>
      Promise.reject(new Error('boom')),
    );

    // when & then
    await expect(
      retry(operation, { maxAttempts: 3, baseDelayMs: 0 }),
    ).rejects.toThrow('boom');
    expect(operation).toHaveBeenCalledTimes(1);
  });

  it('최대 시도 횟수만큼 실패 후 예외를 던집니다.', async () => {
    // given
    const operation = jest.fn<Promise<never>, [number]>(() =>
      Promise.reject(new ConcurrentUpdateException({ entityName: 'Account' })),
    );

    // when & then
    await expect(
      retry(operation, { maxAttempts: 2, baseDelayMs: 0 }),
    ).rejects.toThrow(ConcurrentUpdateException);
    expect(operation).toHaveBeenCalledTimes(2);
  });

  it('커스텀 재시도 조건을 사용합니다.', async () => {
    // given
    class CustomError extends Error {}
    let attempts = 0;
    const operation = jest.fn<Promise<string>, [number]>(() => {
      if (attempts === 0) {
        attempts += 1;
        return Promise.reject(new CustomError('custom'));
      }
      return Promise.resolve('ok');
    });

    // when
    const result = await retry(operation, {
      baseDelayMs: 0,
      shouldRetry: (error) => error instanceof CustomError,
    });

    // then
    expect(result).toBe('ok');
    expect(operation).toHaveBeenCalledTimes(2);
  });

  it('maxAttempts가 0 이하이면 예외를 발생시킵니다.', async () => {
    // given
    const operation = jest.fn().mockResolvedValue('ok');

    // when & then
    await expect(retry(operation, { maxAttempts: 0 })).rejects.toThrow(
      '최대 시도 횟수는 0보다 커야 합니다.',
    );
  });

  it('지수 백오프를 적용합니다 (50ms → 100ms → 200ms)', async () => {
    // given
    const delayTimes: number[] = [];
    const operation = jest.fn<Promise<never>, [number]>(() =>
      Promise.reject(new ConcurrentUpdateException({ entityName: 'Account' })),
    );

    // when & then
    await expect(
      retry(operation, {
        maxAttempts: 3,
        baseDelayMs: 50,
        onRetry: ({ delayMs }) => {
          delayTimes.push(delayMs);
        },
      }),
    ).rejects.toThrow(ConcurrentUpdateException);

    // then
    expect(delayTimes).toEqual([50, 100]);
    expect(operation).toHaveBeenCalledTimes(3);
  });

  it('delayMs가 maxDelayMs를 초과하지 않습니다', async () => {
    // given
    const operation = jest.fn<Promise<never>, [number]>(() =>
      Promise.reject(new ConcurrentUpdateException({ entityName: 'Account' })),
    );
    const delays: number[] = [];

    // when & then
    await expect(
      retry(operation, {
        maxAttempts: 4,
        baseDelayMs: 50,
        maxDelayMs: 100,
        onRetry: ({ delayMs }) => {
          delays.push(delayMs);
        },
      }),
    ).rejects.toThrow(ConcurrentUpdateException);

    // then: 지수 백오프는 [50, 100, 200]이지만 maxDelayMs=100으로 cap됨
    expect(delays).toEqual([50, 100, 100]);
    expect(delays.every((d) => d <= 100)).toBe(true);
  });

  it('jitter를 적용합니다 (50% ~ 150% 범위)', async () => {
    // given
    const operation = jest.fn<Promise<never>, [number]>(() =>
      Promise.reject(new ConcurrentUpdateException({ entityName: 'Account' })),
    );
    const delays: number[] = [];
    const mockRandom = jest
      .fn()
      .mockReturnValueOnce(0.5) // 첫 번째 재시도: 0.5 + 0.5 = 1.0 → delay * 1.0
      .mockReturnValueOnce(0.0); // 두 번째 재시도: 0.5 + 0.0 = 0.5 → delay * 0.5

    // when & then
    await expect(
      retry(operation, {
        maxAttempts: 3,
        baseDelayMs: 100,
        jitter: true,
        random: mockRandom,
        onRetry: ({ delayMs }) => {
          delays.push(delayMs);
        },
      }),
    ).rejects.toThrow(ConcurrentUpdateException);

    // then: 지수 백오프 [100, 200] + jitter 적용
    // 1차: 100 * 1.0 = 100
    // 2차: 200 * 0.5 = 100 → Math.floor(100) = 100
    expect(delays).toEqual([100, 100]);
  });

  it('baseDelayMs < 0이면 예외를 발생시킵니다', async () => {
    // given
    const operation = jest.fn().mockResolvedValue('ok');

    // when & then
    await expect(retry(operation, { baseDelayMs: -1 })).rejects.toThrow(
      '지연 시간은 0 이상이어야 합니다.',
    );
  });

  it('maxDelayMs < 0이면 예외를 발생시킵니다', async () => {
    // given
    const operation = jest.fn().mockResolvedValue('ok');

    // when & then
    await expect(retry(operation, { maxDelayMs: -1 })).rejects.toThrow(
      '지연 시간은 0 이상이어야 합니다.',
    );
  });

  it('onRetry가 실패해도 계속 재시도합니다', async () => {
    // given
    let attempts = 0;
    const operation = jest.fn<Promise<string>, [number]>(() => {
      if (attempts < 2) {
        attempts += 1;
        return Promise.reject(
          new ConcurrentUpdateException({ entityName: 'Account' }),
        );
      }
      return Promise.resolve('ok');
    });
    const onRetry = jest.fn().mockRejectedValueOnce(new Error('hook error'));

    // when
    const result = await retry(operation, {
      maxAttempts: 3,
      baseDelayMs: 0,
      onRetry,
    });

    // then
    expect(result).toBe('ok');
    expect(operation).toHaveBeenCalledTimes(3);
    expect(onRetry).toHaveBeenCalledTimes(2);
  });

  it('onRetry 실패 시 로거로 에러를 기록합니다', async () => {
    // given
    let attempts = 0;
    const operation = jest.fn<Promise<string>, [number]>(() => {
      if (attempts < 1) {
        attempts += 1;
        return Promise.reject(
          new ConcurrentUpdateException({ entityName: 'Account' }),
        );
      }
      return Promise.resolve('ok');
    });

    const errorFn = jest.fn();
    const mockLogger: IRetryLogger = {
      warn: jest.fn(),
      error: errorFn,
    };

    const onRetry = jest.fn().mockRejectedValueOnce(new Error('hook error'));

    // when
    const result = await retry(operation, {
      maxAttempts: 2,
      baseDelayMs: 0,
      onRetry,
      logger: mockLogger,
    });

    // then
    expect(result).toBe('ok');
    expect(errorFn).toHaveBeenCalledWith(
      expect.stringContaining('onRetry 훅 실패'),
      expect.any(Error),
      'retry',
    );
  });

  it('로거가 없으면 에러를 기록하지 않습니다', async () => {
    // given
    let attempts = 0;
    const operation = jest.fn<Promise<string>, [number]>(() => {
      if (attempts < 1) {
        attempts += 1;
        return Promise.reject(
          new ConcurrentUpdateException({ entityName: 'Account' }),
        );
      }
      return Promise.resolve('ok');
    });

    const errorFn = jest.fn();

    const onRetry = jest.fn().mockRejectedValueOnce(new Error('hook error'));

    // when (logger 없음)
    const result = await retry(operation, {
      maxAttempts: 2,
      baseDelayMs: 0,
      onRetry,
      logger: undefined,
    });

    // then
    expect(result).toBe('ok');
    expect(errorFn).not.toHaveBeenCalled();
  });
});
