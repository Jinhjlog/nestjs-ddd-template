---
name: application-layer
description: 'DDD 애플리케이션 레이어 구현. UseCases, Application DTOs, Event Handlers를 생성. "애플리케이션 레이어 구현" 또는 "application layer" 키워드 사용 시 실행.'
allowed-tools: Read, Write, Glob, Grep, Bash
user-invocable: true
---

# Application Layer 구현 스킬

> **범용 패턴(책).** G 단계에서 **Sonnet 서브에이전트가 이 책을 읽고** API 1개씩 구현(`rules/agents.md`).
> **반드시 `.claude/rules/` 준수**: `validation.md`(검증=VO, UseCase는 원시값→VO `create` 위임), `domain.md`(행위 메서드는 이 단계에서 필요해질 때 추가 / 원시투영 `HasPrimitives` 옵트인), `api-response.md §8`(**커맨드(생성/수정)는 재조회 없이 애그리거트 `toPrimitives()` 결과를 반환**). 조회 실패는 NotFound 예외(errorCode 조사).

## ⚠️ IMPORTANT: Claude 자동 실행 지시사항

**Claude는 사용자가 다음과 같은 요청을 하면 이 스킬 사용을 고려해야 합니다:**

### 실행 트리거 (Invoke Triggers)

- "애플리케이션 레이어 구현"
- "Use Case 만들어줘", "UseCase 생성"
- "Application DTO 작성"
- "Event Handler 추가"
- "application layer implementation"
- "create usecase", "implement use case"

**실행 방법:**

```typescript
// 사용자 요청 감지 시 다음을 호출
Skill({ skill: 'application-layer' });
```

**권장 사항:**

- ✅ 복잡한 UseCase 로직이 있을 때 이 스킬 사용 권장
- ✅ 여러 UseCase를 한 번에 생성할 때 이 스킬 사용
- ⚠️ 간단한 UseCase는 직접 구현도 가능

---

DDD(Domain-Driven Design) 패턴에 따라 애플리케이션 레이어를 구현합니다.

## 📋 실행 프로세스

### 1단계: 요구사항 분석

요구사항 문서를 읽고 다음을 판단합니다:

```markdown
# 판단 기준

- 어떤 비즈니스 유즈케이스가 필요한가?
  - Command: Create, Update, Delete, 상태 변경 (Activate, Deactivate 등)
  - Query: 목록 조회, 상세 조회
  - Event: 크로스 모듈 이벤트 처리
- Application DTOs가 필요한가?
- Domain Event Handler가 필요한가?
```

**⏭️ 스킵 조건**:

- 도메인 레이어나 인프라 레이어가 없는 경우
- UseCase가 필요하지 않은 단순 조회만 있는 경우

스킵 시 다음과 같이 출력:

```
⏭️ Application Layer 스킵
이유: 구현할 UseCase가 없습니다.
```

### 2단계: 패턴 문서 참조

구현 전 반드시 패턴 문서를 참조하여 코드 스타일을 맞춥니다:

- `patterns/usecase.md`: UseCase 작성 패턴 (8가지 패턴)
- `patterns/application-dto.md`: Application DTO 작성 패턴 (Input/Output/Query)
- `patterns/event-handler.md`: Event Handler 작성 패턴

### 3단계: 파일 구조 생성

```
src/module/{module-name}/application/
├── usecases/
│   ├── create-{entity}.usecase.ts       # 생성 UseCase (입력 DTO는 이 파일에 인라인)
│   ├── find-{entity}-detail.usecase.ts  # 상세 조회 UseCase
│   ├── find-{entity}-list.usecase.ts    # 목록 조회 UseCase
│   ├── update-{entity}.usecase.ts       # 수정 UseCase
│   ├── delete-{entity}.usecase.ts       # 삭제 UseCase
│   └── index.ts
│   # ※ 애그리거트 2개+ & usecase 多(≈10+)면 애그리거트별 서브폴더로 분리 (예: `<애그리거트A>/`, `<애그리거트B>/`)
├── event-handlers/ (선택)
│   ├── {event-name}.event-handler.ts    # Event Handler
│   └── index.ts
├── ohs/ (선택)                           # 다른 BC에 노출하는 서비스 추상 (cross-BC 전용)
└── ports/ (선택)                         # 이 모듈이 소비하는 아웃바운드 포트 추상 (*.port.ts)
```

> **DTO 인라인 (전사 표준)**: 1:1·private 입력 DTO는 `application/dtos/` 폴더를 만들지 말고 UseCase 파일 상단에 `export interface`로 둔다. 공유 DTO(2개+ UseCase)만 별도 파일 — 단 그건 결합 신호.

### 4단계: 패턴 문서 기반 구현

`patterns/` 디렉토리의 패턴 문서를 참조하여 직접 구현합니다:

- `patterns/usecase.md`: UseCase 작성 패턴 (8가지 패턴)
- `patterns/application-dto.md`: Application DTO 작성 패턴 (Input/Output/Query)
- `patterns/event-handler.md`: Event Handler 작성 패턴

---

## 🎯 구현 워크플로우

### 권장 순서

#### Case 1: CRUD UseCase 구현

1. **Create UseCase 생성** → 입력 DTO를 파일 상단에 `export interface`로 인라인, `Entity.create()` 정적 메서드 사용, Value Objects 생성, 저장
2. **Find UseCases 생성** → Query Service 호출, ReadModel 반환, 예외 처리
3. **Update UseCase 생성** → 도메인 메서드 호출 (직접 props 수정 금지)
4. **Delete UseCase 생성** → 존재 확인 후 Repository.delete() 호출

#### Case 2: Event Handler 추가

1. **Event Handler 생성** → `event-handlers/` 디렉토리에 생성
2. **필요한 UseCase 주입** → `event.metadata`에서 데이터 추출, UseCase 실행

#### Case 3: 모듈 노출 서비스 / 소비 포트 (cross-BC 동기 협력)

> 한 모듈이 **다른 BC** 모듈에 동기로 기능을 제공/소비할 때. (상세 정책: `conventions.md` §6)
> ⚠️ **같은 BC 안에서 글루가 필요하면 모듈을 합친다 — intra-BC 노출 서비스는 두지 않는다.** (BC = 모듈 1개)

1. **노출(cross-BC 전용)**: 추상 클래스를 `application/ohs/`에 정의. 구현은 `useClass` 바인딩, 모듈 `exports: [추상]` (구현 클래스는 export 안 함 = 은닉).
2. **소비**: 의존하는 아웃바운드 추상은 `application/ports/*.port.ts`. UseCase는 **추상 포트만** 주입 (다른 모듈 구체 클래스 import 금지).
3. **노출 서비스 구현은 오케스트레이션만** — 도메인/애그리거트에 위임, 불변식은 데이터 소유 모듈이 강제.

---

## 🎯 실행 결과 출력

구현 완료 시:

```
✅ Application Layer 구현 완료

생성된 파일: (입력 DTO는 각 UseCase 파일에 인라인 — 별도 dtos/ 없음)
- application/usecases/create-{entity}.usecase.ts
- application/usecases/find-{entity}-detail.usecase.ts
- application/usecases/find-{entity}-list.usecase.ts
- application/usecases/update-{entity}.usecase.ts
- application/usecases/delete-{entity}.usecase.ts
- application/usecases/index.ts

다음 단계: Presentation Layer 구현
```

## ⚠️ 주의사항

1. **패턴 문서 준수**: 반드시 `patterns/` 문서의 패턴을 따릅니다
2. **Entity.create() 사용**: 엔티티 생성 시 정적 팩토리 메서드 사용 (`new Entity()` 금지)
3. **Value Objects 생성**: UseCase에서 `BoundedString.create()` 등 사용
4. **예외 처리**: 엔티티 없을 때 `EntityNotFoundException` 발생
5. **Query Service 사용**: 조회는 Query Service + ReadModel 반환. 단 **커맨드는 QueryService 미사용** — 자기 컨텍스트 존재/스코프 확인은 Repository finder(`existsBy...`/`findByIdAndOwner`), 크로스 BC는 LookupService
6. **도메인 메서드 호출**: 수정 시 도메인 메서드 사용 (직접 props 수정 금지)
7. **Event 데이터**: `event.metadata` 사용 (`event.payload` 아님)
8. **한국어 주석**: 모든 주석은 한국어로 작성

## 🚫 하지 말아야 할 것

- ❌ UseCase에 비즈니스 로직 직접 작성 (도메인 레이어에 작성)
- ❌ `new Entity()` 직접 호출 (`Entity.create()` 사용)
- ❌ Application DTO에 Value Objects 사용
- ❌ Application DTO를 `class`로 정의 (`interface` 사용)
- ❌ 조회 UseCase에서 도메인 엔티티 반환
- ❌ props 직접 수정 (도메인 메서드 사용)
- ❌ Presentation Layer 의존성 (Controller, Request DTO 등)
- ❌ `event.payload` 사용 (`event.metadata` 사용)
- ❌ Event Handler를 `handlers/` 디렉토리에 생성 (`event-handlers/` 사용)
- ❌ 다른 모듈의 **구체 클래스/내부 직접 import** (노출 추상·포트만 의존, `conventions.md` §6)
