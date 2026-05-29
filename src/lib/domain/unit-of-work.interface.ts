/**
 * Unit of Work 인터페이스
 *
 * 여러 Repository 작업을 하나의 트랜잭션으로 묶어서 실행하기 위한 추상화 인터페이스입니다.
 * Application Layer가 Infrastructure (Prisma)에 직접 의존하지 않도록 합니다.
 */
export interface IUnitOfWork {
  /**
   * 트랜잭션 내에서 작업을 실행합니다.
   *
   * @param work 트랜잭션 내에서 실행할 함수
   * @returns 작업 결과
   *
   * @example
   * ```typescript
   * await unitOfWork.execute(async (uow) => {
   *   const txContext = uow.getTransactionContext();
   *   const repo1 = new Repo1(null, txContext);
   *   const repo2 = new Repo2(null, txContext);
   *
   *   await repo1.save(entity1);
   *   await repo2.save(entity2);
   * });
   * ```
   */
  execute<T>(work: (uow: IUnitOfWork) => Promise<T>): Promise<T>;

  /**
   * Repository가 트랜잭션 컨텍스트를 가져올 수 있도록 제공합니다.
   *
   * ⚠️ 주의: Infrastructure Layer에서만 사용하세요.
   * Application Layer에서는 execute() 메서드만 사용해야 합니다.
   *
   * @returns 트랜잭션 컨텍스트 (Prisma의 경우 tx 객체)
   */
  getTransactionContext(): any;
}
