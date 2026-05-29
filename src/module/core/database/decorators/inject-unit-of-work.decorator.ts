import { Inject } from '@nestjs/common';
import { UNIT_OF_WORK } from '../tokens/unit-of-work.token';

/**
 * Unit of Work 주입 데코레이터
 *
 * IUnitOfWork를 주입받기 위한 커스텀 데코레이터입니다.
 * 내부적으로 Symbol 토큰을 사용하여 타입 안전한 주입을 제공합니다.
 *
 * @example
 * ```typescript
 * @Injectable()
 * export class SomeUseCase {
 *   constructor(
 *     @InjectUnitOfWork() private readonly uow: IUnitOfWork,
 *   ) {}
 * }
 * ```
 */
export const InjectUnitOfWork = () => Inject(UNIT_OF_WORK);
