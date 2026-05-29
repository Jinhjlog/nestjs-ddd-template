import { Injectable } from '@nestjs/common';
import { AsyncLocalStorage } from 'async_hooks';

/**
 * 트랜잭션 컨텍스트 관리 서비스 (제네릭)
 *
 * AsyncLocalStorage를 사용하여 비동기 호출 체인 전체에서
 * 트랜잭션 컨텍스트를 공유합니다.
 *
 * 제네릭 타입을 사용하여 특정 ORM/라이브러리에 의존하지 않습니다.
 *
 * @template TTransactionClient 트랜잭션 클라이언트 타입 (예: Prisma, TypeORM 등)
 *
 * @example
 * ```typescript
 * // Prisma와 함께 사용
 * const service = new TransactionContextService<PrismaTransactionClient>();
 *
 * // 트랜잭션 시작
 * await txContext.run(tx, async () => {
 *   // 이 안의 모든 비동기 작업이 같은 tx 공유
 *   await repository.save(...);  // ← 자동으로 tx 사용
 * });
 * ```
 */
@Injectable()
export class TransactionContextService<TTransactionClient = any> {
  private readonly storage = new AsyncLocalStorage<TTransactionClient>();

  /**
   * 트랜잭션 컨텍스트 내에서 작업 실행
   *
   * @param tx 트랜잭션 클라이언트
   * @param callback 실행할 작업
   * @returns 작업 결과
   */
  run<T>(tx: TTransactionClient, callback: () => Promise<T>): Promise<T> {
    return this.storage.run(tx, callback);
  }

  /**
   * 현재 트랜잭션 컨텍스트 가져오기
   *
   * AsyncLocalStorage에서 자동으로 현재 실행 컨텍스트의
   * 트랜잭션 클라이언트를 찾아 반환합니다.
   *
   * @returns 트랜잭션 컨텍스트 (트랜잭션 외부면 undefined)
   */
  getTransactionContext(): TTransactionClient | undefined {
    return this.storage.getStore();
  }

  /**
   * 현재 트랜잭션 내부인지 확인
   *
   * @returns 트랜잭션 내부면 true, 외부면 false
   */
  isInTransaction(): boolean {
    return this.storage.getStore() !== undefined;
  }
}
