# Rules: 도메인/레이어 (범용)

## YAGNI — 예측 메서드 금지

- Aggregate/Entity는 **`create()` + `unsafeCreate()`(복원용) + getter만** 우선.
- 행위 메서드(`changeStatus`/`update`/`activate` 등)는 **미리 만들지 않는다** → **실제 필요해지는 UseCase 시점**에 정확한 시그니처로 추가.
- VO도 동일: `create`/`unsafeCreate`/getter만. 사용처 없는 헬퍼 미리 만들지 않음.
- **단계 규율**: 현재 레이어 밖 관심사를 미리 끌어오지 않는다.

## 원시 투영 (`HasPrimitives`) — 옵트인

- 커맨드(생성/수정) 응답을 **재조회 없이 애그리거트에서 직접** 주려면, 그 애그리거트가 **`HasPrimitives<P>`**(`@lib/domain`)를 **implements** 하고 `toPrimitives()`로 **민감필드(password 등) 제외한 원시 표현**을 반환한다. (`api-response.md §8`)
- **base(`Entity`/`AggregateRoot`)에 abstract로 강제하지 않는다** — ① 모든 모델이 응답 투영을 필요로 하지 않음(YAGNI) ② "충실한 전체 스냅샷" vs "안전한 공개 투영"은 목적이 달라 하나로 강제하면 의미가 어긋남 ③ 큐레이션 누수 표면이 넓어짐. → **필요한 애그리거트만 옵트인.**
- `XxxPrimitives` 타입은 그 애그리거트 파일에 co-locate. UseCase 반환 타입으로 쓰고, presentation은 **쿼리 ReadModel과 분리된** 전용 변환(`fromPrimitives`)으로 응답 DTO에 매핑.

## Repository (도메인 인터페이스)

- 도메인엔 **인터페이스(추상)** 만, 구현은 인프라에. (NestJS면 DI 토큰용 `abstract class` — 프레임워크 관례는 조사)
- **최소 메서드만**: 보통 `save` / `findById` / `delete`. 그 외(`countBy...` 등)는 **그걸 쓰는 UseCase가 생길 때** 추가.
- **커맨드의 자기 컨텍스트 존재/스코프 확인**(`existsBy...`/`findByIdAndOwner` 등)도 여기에 둔다 — 읽기 측(QueryService)이 아니라 **쓰기 측(Repository)**. (§Query Service CQRS와 연결)
- 없을 수 있는 반환은 `undefined`(내부 레이어 컨벤션) — _null/undefined 관례는 그 프로젝트 조사_.

## Query Service (복잡 조회)

- 목록/상세 등 복잡 조회는 Repository가 아니라 **QueryService** + **ReadModel**(primitive only) 반환.
- 페이지네이션 방식·공용 유틸은 조사해 재사용.
- **QueryService는 읽기(GET 플로우) 전용. 커맨드(쓰기 유스케이스)는 QueryService에 의존하지 않는다.** 자기 컨텍스트의 존재/스코프 확인은 **Repository finder**(`existsBy...`/`findByIdAndOwner` 등 — §Repository), 크로스 BC 존재 확인은 **LookupService**. 커맨드가 read-model을 불변식 강제·가드에 쓰면 CQRS 오염이다.

## 통합 패턴 선택 (BC 간 / 외부 시스템 연동)

4계층 위에 얹는 통합 패턴은 **필요할 때만** 만든다(대부분 모듈은 `services/`만 사용 — `ports/`·`ohs/`·`adapters/`는 선택).

| 패턴 | 인터페이스 위치 | 구현 위치 | 언제 쓰나 |
| ---- | --------------- | --------- | --------- |
| **QueryService** | `domain/services/` | `infra/services/` | 복잡한 목록/상세 조회 (ReadModel 반환) |
| **LookupService** | `domain/services/` | `infra/services/` | 다른 BC 엔티티 **존재 확인(boolean) / 데이터 읽기·번역** |
| **Port** | `application/ports/` | `infra/adapters/` | 외부 **기술 추상화** — "다른 기술로 교체 가능한가?" Yes (스토리지·OAuth·메시징 등) |
| **OHS** (Open Host Service) | `application/ohs/` | `infra/ohs/` | "다른 BC가 이 기능을 쓰는가?" Yes → 공개 API 계약 |

- 선택이 헷갈리면: 외부 **기술**을 갈아끼우는 것 → **Port/Adapter**, 다른 **BC에 기능을 여는 것** → **OHS**, 다른 BC 데이터를 **읽기만** → **LookupService**.
- 외부 의존(결제·스토리지 등)을 Domain Service abstract class로 둘지 Port로 둘지 헷갈리면 — **"기술 교체 가능성"이 핵심이면 Port**(application/ports), 도메인 규칙·타 BC 조회 성격이면 Domain Service.
- **명확화**: **외부 시스템/기술과의 통신(결제 게이트웨이·스토리지·OAuth·메시징·이메일 등)은 전부 Port.** Domain Service(abstract)는 **우리 DB로 타 BC를 읽는 LookupService** 또는 **순수 도메인 규칙**에만 쓴다. (같은 "결제"라도 *게이트웨이 호출*=Port, *우리 DB의 결제 데이터 읽기*=LookupService — **외부 통신 여부가 분기점**.)
- **실증 레퍼런스**: `file-upload` 모듈이 Port/Adapter + OHS의 실제 구현. 새로 만들 땐 이 모듈을 조사해 동일 패턴을 따른다(`rules/conventions.md` 조사 원칙).
- **정책·DIP 규칙**(cross-BC 전용·intra-BC 노출 금지·구현 은닉·오케스트레이션만)은 `conventions.md` §6 참조. (이 테이블은 *배치*, §6은 *정책*)

## Mapper / null↔undefined

- `toDomain`: VO는 **`unsafeCreate`**. DB `null` → 도메인 `undefined`(삼항 연산자, `??` 금지 — 정확성).
- `toPersistence`: VO는 `.value`, 도메인 `undefined` → DB `null`. FK 직접 설정(관계 connect 지양) — _ORM별 관례 조사_.

## 하위 컬렉션 삭제 (제거 추적)

- 하위 Entity 컬렉션 삭제는 **도메인이 추적한 제거 ID(`removedXxxIds`) 기반**. Aggregate가 `removeXxx()`에서 제거분을 기록하고, Repository는 **그 ID만** `deleteMany({ id: { in: removed } })` 한다.
- **`deleteMany(NOT IN 현재ID들)` orphan removal 금지** — 동시 저장 시 다른 요청이 추가한 행을 phantom delete 한다(stale 스냅샷 기반·트랜잭션으로도 못 막음). _기존 코드가 `notIn`을 쓰더라도 따르지 않는다 — 명시 금지 > 기존 사례._
- append-only 컬렉션은 삭제 단계 없이 `upsert`만. (상세: domain-layer/infrastructure-layer 스킬)

## BC·모듈 경계 (aggregate ≠ module)

- **BC ≈ 모듈 1개가 기본.** 한 BC에 여러 애그리거트가 **한 모듈로 공존**하는 게 정상 — **애그리거트마다 모듈을 쪼개지 않는다(`aggregate ≠ module`).**
- 모듈을 쪼개는 건 **독립 배포·독립 스케일링·팀 경계** 같은 구체적 force가 있을 때만. 단순히 "다른 애그리거트라서"는 분리 근거가 아니다.
- **비동기 잡 워커는 모듈 분리 근거가 아니다.** 별도 배포·독립 스케일링이 아니면 워커(잡 큐 producer/consumer)는 **그 모듈의 infra 서비스**로 둔다. (NestJS·modular-monolith 베스트와 일치)
- **불변식은 데이터를 소유한 모듈이 강제한다.** 같은 불변식(예: 유일성)을 **소비 모듈에서 중복 체크하지 않는다** — 소유 모듈의 애그리거트/서비스가 throw하게 두고 호출만 한다. (크로스모듈 read를 dedup용으로 중복 두는 것도 금지)

## 모듈 등록

- Repository/QueryService는 인터페이스↔구현 바인딩으로 등록, UseCase·Controller는 역할별 모듈에. 기존 모듈 등록 방식을 조사해 동일하게.
