export class ArrayUtil {
  /**
   * 배열을 지정된 크기의 청크로 분할합니다.
   *
   * @param array 분할할 배열
   * @param size 각 청크의 크기
   * @returns 분할된 배열들의 배열
   *
   * @example
   * ```typescript
   * const numbers = [1, 2, 3, 4, 5, 6, 7, 8, 9];
   * const chunks = ArrayUtils.chunk(numbers, 3);
   * // 결과: [[1, 2, 3], [4, 5, 6], [7, 8, 9]]
   * ```
   */
  static chunk<T>(array: T[], size: number): T[][] {
    if (size <= 0) {
      throw new Error('청크 크기는 0보다 커야 합니다.');
    }

    if (array.length === 0) {
      return [];
    }

    return Array.from({ length: Math.ceil(array.length / size) }, (_, i) =>
      array.slice(i * size, i * size + size),
    );
  }

  /**
   * 총 개수와 배치 크기를 기반으로 배치 정보를 계산합니다.
   *
   * @param totalCount 총 아이템 개수
   * @param batchSize 각 배치의 크기
   * @returns 배치 정보 객체
   *
   * @example
   * ```typescript
   * const batchInfo = ArrayUtil.calculateBatchInfo(1000, 200);
   * // 결과: 5
   * ```
   */
  static calculateTotalBatches(totalCount: number, batchSize: number): number {
    if (batchSize <= 0) {
      throw new Error('배치 크기는 0보다 커야 합니다.');
    }

    if (totalCount < 0) {
      throw new Error('총 개수는 0 이상이어야 합니다.');
    }

    const totalBatches = Math.ceil(totalCount / batchSize);

    return totalBatches;
  }
}
