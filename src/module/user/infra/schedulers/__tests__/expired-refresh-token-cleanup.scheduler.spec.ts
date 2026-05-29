import { Test, TestingModule } from '@nestjs/testing';
import { ExpiredRefreshTokenCleanupScheduler } from '../expired-refresh-token-cleanup.scheduler';
import { RefreshTokenRepository } from '../../../domain/repositories/refresh-token.repository';

describe('ExpiredRefreshTokenCleanupScheduler', () => {
  let scheduler: ExpiredRefreshTokenCleanupScheduler;
  let deleteExpiredMock: jest.Mock;

  beforeEach(async () => {
    deleteExpiredMock = jest.fn();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ExpiredRefreshTokenCleanupScheduler,
        {
          provide: RefreshTokenRepository,
          useValue: {
            deleteExpired: deleteExpiredMock,
          },
        },
      ],
    }).compile();

    scheduler = module.get(ExpiredRefreshTokenCleanupScheduler);
  });

  it('만료된 토큰을 삭제하고 건수를 로깅한다', async () => {
    deleteExpiredMock.mockResolvedValue(5);

    await scheduler.handleCleanup();

    expect(deleteExpiredMock).toHaveBeenCalledTimes(1);
  });

  it('삭제 건수가 0이어도 정상 동작한다', async () => {
    deleteExpiredMock.mockResolvedValue(0);

    await scheduler.handleCleanup();

    expect(deleteExpiredMock).toHaveBeenCalledTimes(1);
  });

  it('Repository 에러 발생 시 예외를 전파하지 않는다', async () => {
    deleteExpiredMock.mockRejectedValue(new Error('DB connection failed'));

    await expect(scheduler.handleCleanup()).resolves.not.toThrow();
  });
});
