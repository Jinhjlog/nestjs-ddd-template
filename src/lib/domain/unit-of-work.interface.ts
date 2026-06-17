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
   * // 다중 애그리거트를 한 트랜잭션으로 (즉시 일관성 필요 시)
   * // Repository는 트랜잭션을 모른다 — PrismaService가 ambient(ALS)로 자동 전파.
   * await this.uow.execute(async () => {
   *   await this.orderRepo.save(order);
   *   await this.buyerRepo.save(buyer);
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
