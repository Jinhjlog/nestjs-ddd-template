import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaClient } from '@prisma/generated/client';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';
import { EnvironmentConfig } from '@core/config/environment.config';
import { TransactionContextService } from '@lib/infra/unit-of-work';
import { PrismaTransactionClient } from './prisma.types';

/**
 * Prisma 클라이언트 (ambient 트랜잭션 전파 내장)
 *
 * 생성자가 **자기 자신을 Proxy로 감싸 반환**한다. UnitOfWork(`uow.execute`)가
 * 트랜잭션을 열면 `TransactionContextService`(AsyncLocalStorage)에 tx가 저장되고,
 * 그 컨텍스트 안에서의 **모델/raw 연산이 자동으로 tx로 위임**된다.
 *
 * → Repository는 트랜잭션을 전혀 몰라도 된다. 평소대로 `this.prisma.xxx`만 쓰면
 *   트랜잭션 밖에선 일반 커넥션, `uow.execute` 안에선 tx로 실행된다. (A안의
 *   `this.client` 게터 보일러플레이트·누락 위험 제거)
 *
 * 위임 대상: 모델 델리게이트 + `$queryRaw`/`$executeRaw` 등(= `PrismaTransactionClient`).
 * 위임 제외(항상 base): `$transaction`·`$connect`·`$disconnect`·`$on`·`$extends` 등
 *   트랜잭션 제어·라이프사이클과 비함수 속성. (tx에 존재하지 않으므로 자연히 base 유지)
 *
 * 오버헤드: get 트랩당 getStore + Reflect.get + bind ≈ 수백 ns로, DB 왕복(밀리초) 대비
 *   0.0x%라 실무상 무시 가능(`scripts/bench`로 실측 검증된 설계).
 */
@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  constructor(
    configService: ConfigService<EnvironmentConfig, true>,
    private readonly txContext: TransactionContextService<PrismaTransactionClient>,
  ) {
    const dbConfig =
      configService.get<EnvironmentConfig['database']>('database');

    const adapter = new PrismaMariaDb({
      host: dbConfig.host,
      port: dbConfig.port,
      user: dbConfig.user,
      password: dbConfig.password,
      database: dbConfig.name,
      connectionLimit: dbConfig.connectionLimit,
    });

    super({ adapter });

    // ambient 트랜잭션 전파: 활성 tx가 있고 그 속성이 tx에 존재하면 tx로 위임,
    // 아니면 base(this)로. 함수는 해당 클라이언트에 bind해 내부 this 일관성 유지
    // (base 메서드는 base에 bind → 트랩 재귀 없음).
    // 활성 tx가 있고 그 속성이 tx에 존재하면 tx에서, 아니면 base(target)에서 가져온다.
    // 함수는 해당 클라이언트에 bind(내부 this 일관성 유지 → 트랩 재귀 없음).
    const pick = (client: object, prop: string | symbol): unknown => {
      const value = Reflect.get(client, prop, client) as unknown;
      return typeof value === 'function'
        ? (value as (...args: unknown[]) => unknown).bind(client)
        : value;
    };

    return new Proxy(this, {
      get(target, prop) {
        const tx = target.txContext?.getTransactionContext();
        return tx && prop in (tx as object)
          ? pick(tx as object, prop)
          : pick(target, prop);
      },
    });
  }

  async onModuleInit() {
    await this.$connect();

    // 실제 쿼리를 날려서 DB 연결 확인
    await this.$queryRaw`SELECT 1 as test`;
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
