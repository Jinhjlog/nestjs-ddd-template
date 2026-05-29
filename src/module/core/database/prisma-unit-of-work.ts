import { Injectable } from '@nestjs/common';
import { IUnitOfWork } from '@lib/domain/unit-of-work.interface';
import { TransactionContextService } from '@lib/infra/unit-of-work';
import { PrismaService, PrismaTransactionClient } from './index';

/**
 * Prisma 기반 Unit of Work 구현체
 *
 * Prisma의 $transaction과 AsyncLocalStorage를 사용하여
 * 여러 Repository 작업을 하나의 트랜잭션으로 묶어 실행합니다.
 *
 * AsyncLocalStorage를 통해 트랜잭션 컨텍스트가 자동으로 전파되므로
 * Repository는 주입받은 인스턴스를 그대로 사용할 수 있습니다.
 */
@Injectable()
export class PrismaUnitOfWork implements IUnitOfWork {
  constructor(
    private readonly prisma: PrismaService,
    private readonly txContext: TransactionContextService<PrismaTransactionClient>,
  ) {}

  /**
   * Prisma 트랜잭션 내에서 작업을 실행합니다.
   *
   * AsyncLocalStorage에 트랜잭션 컨텍스트를 저장하여
   * 모든 Repository가 자동으로 트랜잭션을 사용하도록 합니다.
   *
   * @param work 실행할 작업
   * @returns 작업 결과
   */
  async execute<T>(work: (uow: IUnitOfWork) => Promise<T>): Promise<T> {
    return this.prisma.$transaction(async (tx) => {
      // AsyncLocalStorage에 트랜잭션 컨텍스트 저장하고 실행
      return this.txContext.run(tx, async () => {
        return work(this);
      });
    });
  }

  /**
   * 현재 트랜잭션 컨텍스트를 가져옵니다.
   *
   * AsyncLocalStorage에서 자동으로 현재 실행 컨텍스트의
   * 트랜잭션 클라이언트를 찾아 반환합니다.
   *
   * @throws {Error} 트랜잭션 외부에서 호출 시
   * @returns Prisma 트랜잭션 클라이언트
   */
  getTransactionContext() {
    const tx = this.txContext.getTransactionContext();
    if (!tx) {
      throw new Error('Not in transaction context');
    }
    return tx;
  }
}
