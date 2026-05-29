# Rules: 도메인/레이어 (범용)

## YAGNI — 예측 메서드 금지

- Aggregate/Entity는 **`create()` + `unsafeCreate()`(복원용) + getter만** 우선.
- 행위 메서드(`changeStatus`/`update`/`activate` 등)는 **미리 만들지 않는다** → **실제 필요해지는 UseCase 시점**에 정확한 시그니처로 추가.
- VO도 동일: `create`/`unsafeCreate`/getter만. 사용처 없는 헬퍼 미리 만들지 않음.
- **단계 규율**: 현재 레이어 밖 관심사를 미리 끌어오지 않는다.

## Repository (도메인 인터페이스)

- 도메인엔 **인터페이스(추상)** 만, 구현은 인프라에. (NestJS면 DI 토큰용 `abstract class` — 프레임워크 관례는 조사)
- **최소 메서드만**: 보통 `save` / `findById` / `delete`. 그 외(`countBy...` 등)는 **그걸 쓰는 UseCase가 생길 때** 추가.
- 없을 수 있는 반환은 `undefined`(내부 레이어 컨벤션) — _null/undefined 관례는 그 프로젝트 조사_.

## Query Service (복잡 조회)

- 목록/상세 등 복잡 조회는 Repository가 아니라 **QueryService** + **ReadModel**(primitive only) 반환.
- 페이지네이션 방식·공용 유틸은 조사해 재사용.

## 통합 패턴 선택 (BC 간 / 외부 시스템 연동)

4계층 위에 얹는 통합 패턴은 **필요할 때만** 만든다(대부분 모듈은 `services/`만 사용 — `ports/`·`ohs/`·`adapters/`는 선택).

| 패턴 | 인터페이스 위치 | 구현 위치 | 언제 쓰나 |
| ---- | --------------- | --------- | --------- |
| **QueryService** | `domain/services/` | `infra/services/` | 복잡한 목록/상세 조회 (ReadModel 반환) |
| **LookupService** | `domain/services/` | `infra/services/` | 다른 BC 엔티티 **존재 확인 / 읽기**(ACL) |
| **Port** | `application/ports/` | `infra/adapters/` | 외부 **기술 추상화** — "다른 기술로 교체 가능한가?" Yes (스토리지·OAuth·메시징 등) |
| **OHS** (Open Host Service) | `application/ohs/` | `infra/ohs/` | "다른 BC가 이 기능을 쓰는가?" Yes → 공개 API 계약 |

- 선택이 헷갈리면: 외부 **기술**을 갈아끼우는 것 → **Port/Adapter**, 다른 **BC에 기능을 여는 것** → **OHS**, 다른 BC 데이터를 **읽기만** → **LookupService**.
- 외부 의존(결제·스토리지 등)을 Domain Service abstract class로 둘지 Port로 둘지 헷갈리면 — **"기술 교체 가능성"이 핵심이면 Port**(application/ports), 도메인 규칙·타 BC 조회 성격이면 Domain Service.
- **실증 레퍼런스**: `file-upload` 모듈이 Port/Adapter + OHS의 실제 구현. 새로 만들 땐 이 모듈을 조사해 동일 패턴을 따른다(`rules/conventions.md` 조사 원칙).

## Mapper / null↔undefined

- `toDomain`: VO는 **`unsafeCreate`**. DB `null` → 도메인 `undefined`(삼항 연산자, `??` 금지 — 정확성).
- `toPersistence`: VO는 `.value`, 도메인 `undefined` → DB `null`. FK 직접 설정(관계 connect 지양) — _ORM별 관례 조사_.

## 모듈 등록

- Repository/QueryService는 인터페이스↔구현 바인딩으로 등록, UseCase·Controller는 역할별 모듈에. 기존 모듈 등록 방식을 조사해 동일하게.
