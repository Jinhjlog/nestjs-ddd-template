# Unit of Work — 다중 애그리거트 트랜잭션 (ambient 전파)

> 이 문서는 **배경·원리·함정·검증**을 다룬다. **사용법**은 `application-layer/patterns/usecase.md`(패턴 3-B), **선택 정책**(언제 UoW vs 이벤트)은 `rules/domain.md`(트랜잭션 경계)에 있다.

## 1. 목적

같은 BC의 **애그리거트 2개 이상을 한 트랜잭션으로** 함께 커밋/롤백해야 할 때(즉시 일관성이 그 유스케이스의 책임일 때) 쓴다. 단일 애그리거트면 불필요하고, 즉시 일관성이 필요 없으면 도메인 이벤트(결과적 일관성)가 기본이다.

## 2. 구조

```
UseCase
  └─ uow.execute(async () => { await repoA.save(); await repoB.save(); })
       │
       ▼
IUnitOfWork (@lib/domain/unit-of-work.interface.ts)           ← 계약(추상)
  └─ PrismaUnitOfWork (core/database/prisma-unit-of-work.ts)  ← 구현
       │  prisma.$transaction(tx => txContext.run(tx, work))
       ▼
TransactionContextService (lib/infra/unit-of-work/...)         ← AsyncLocalStorage 래퍼
       │  run(tx, cb): ALS 컨텍스트에 tx 저장
       ▼
PrismaService (core/database/prisma.service.ts)                ← self-Proxy
       │  get 트랩: 활성 tx 있으면 모델/raw 연산을 tx로, 없으면 base
       ▼
Repository  this.prisma.model.xxx()                            ← 트랜잭션을 "모름"
```

- **바인딩**: `DatabaseModule`이 `{ provide: UNIT_OF_WORK, useClass: PrismaUnitOfWork }` + `TransactionContextService` + `PrismaService`를 등록·export. UseCase는 `@InjectUnitOfWork()`로 주입.
- **위임 대상**: 모델 델리게이트 + `$queryRaw`/`$executeRaw` (= `PrismaTransactionClient`). **제외(항상 base)**: `$transaction`·`$connect`·`$disconnect`·`$on`·`$extends` (tx에 없으므로 자연히 base 유지).

## 3. 왜 B-Proxy인가 (repo를 안 건드리는 ambient 전파)

대안 A안은 repo마다 `private get client() { return txContext.getTransactionContext() ?? this.prisma }` 게터를 두고 `this.client`로 쿼리하는 방식이다. 동작하지만:

- **보일러플레이트**: 모든 repo가 `txContext` 주입 + `client` 게터 반복.
- **누락 위험(치명적)**: 한 repo라도 `this.prisma`를 직접 쓰면, 그 repo의 save는 `uow.execute` 트랜잭션에 **합류하지 않고 루트 커넥션으로 새서** 트랜잭션이 조용히 깨진다. (실제로 한 레퍼런스 프로젝트에서 다수 repo가 이 누락 상태였음.)

**B-Proxy**는 `PrismaService` 생성자가 자기 자신을 `Proxy`로 감싸 반환한다 → repo는 평소처럼 `this.prisma.x`만 써도 트랜잭션 중엔 자동으로 tx로 위임된다. **누락 자체가 구조적으로 불가능**.

### 오버헤드

get 트랩당 비용 = `getStore()`(~15ns) + `Reflect.get` + `bind` ≈ **수백 ns**. DB 왕복(밀리초)의 **~0.03%** 라 측정 노이즈에 묻힌다(실측 검증함). `$extends` 기반 전파는 트랜잭션과 결합 시 수십 배 악화 사례가 있어 채택하지 않았다 — **Proxy + ALS** 조합이 정답.

## 4. 왜 동시 요청에서 tx가 안 섞이나 (ALS 격리)

가장 중요한 보장. 전역 변수로 "현재 tx"를 들면 동시 요청에서 **즉시 오염**된다. `AsyncLocalStorage`는 이를 막는 Node 표준 메커니즘이다.

- `txContext.run(tx, cb)` = `als.run(tx, cb)` → **cb에서 파생되는 모든 `await` 체인**이 그 tx를 본다.
- `uow.execute`는 매 호출마다 새 `$transaction`을 열고 `run(tx, work)`로 감싼다 → 요청 A의 체인은 항상 txA, 요청 B는 txB.
- `Promise.all`로 인터리빙(번갈아 재개)돼도, Node가 **각 await 재개 시 원래 컨텍스트를 복원**한다 → 시간상 겹쳐도 **컨텍스트는 안 섞인다.**

### ALS가 깨지는 경우 (함정 → §6)

ALS는 **async/await 직선 체인에서만** 컨텍스트를 이어준다. 컨텍스트를 벗어나 나중에 호출되는 콜백(이벤트에미터 지연 실행, 커스텀 Promise 큐/풀, `setInterval`)에선 `getStore()`가 엉뚱한 값/`undefined`가 될 수 있다. 표준 UoW 사용법(`uow.execute(async () => { await repo.save() })`)은 직선 체인이라 안전하다.

## 5. 검증 (어떻게 증명했나)

통합 테스트: `test/integration/database/unit-of-work.int-spec.ts` (`npm run test:int`).
**원리 = "트랜잭션은 롤백되면 흔적이 안 남는다"를 리트머스로 사용** → DB 최종 상태로 전파·격리를 역증명.

| 케이스                                                                 | 증명하는 것                                                           |
| ---------------------------------------------------------------------- | --------------------------------------------------------------------- |
| `uow.execute` 안 create + throw → **행 없음**                          | 쓰기가 **tx 안에서** 실행됨 (루트로 샜으면 행이 남아 실패) = **전파** |
| 한 execute 2건 쓰고 throw → **count 0**                                | 다중 쓰기 **원자성**                                                  |
| 30개 동시, 1/3 롤백 → **롤백분만 사라지고 커밋분은 2차 쓰기까지 온전** | **동시 격리** (섞였으면 이 깔끔한 분리 불가)                          |
| 40개 동시 전부 커밋 → **정확히 40행**                                  | 고동시성 **누수·중복 없음**                                           |

> 한계: 이 검증은 **애플리케이션 레벨 ALS 격리**를 증명한다. DB의 격리수준(dirty read 등)·행 락 경합 의미론은 DB(MariaDB 기본 REPEATABLE READ)에 위임하며 이 테스트 범위가 아니다.

## 6. ⚠️ 함정 / 금지

- **트랜잭션 없이 `save` 두 번 금지**: `await repoA.save(); await repoB.save();`는 서로 다른 트랜잭션 → 부분 실패 시 불일치. 묶으려면 `uow.execute`, 아니면 이벤트로 분리.
- **ALS 컨텍스트 이탈 주의**: `uow.execute` 안에서 이벤트에미터 지연 콜백·커스텀 큐·타이머로 작업을 넘기면 전파가 끊긴다. 트랜잭션 작업은 같은 async 체인에서 `await`로.
- **repo를 애그리거트에 주입 금지**: 의존 객체는 애그리거트 메서드 호출 전에 준비해 인자로 넘긴다.
- **cross-BC를 한 UoW로 묶지 않는다**: 다른 BC는 LookupService(읽기)·도메인 이벤트·OHS로 협력. 분산 트랜잭션을 만들지 않는다.

## 7. 언제 안 쓰나

- 단일 애그리거트 커맨드 → UoW 불필요(평범한 repo.save).
- 즉시 일관성이 필수가 아닌 다중 애그리거트 → 도메인 이벤트(결과적 일관성)가 기본.
- 선택 기준 전체는 `rules/domain.md`(트랜잭션 경계) 참조.
