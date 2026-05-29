---
name: infrastructure-layer
description: '**PROACTIVE SKILL - AUTO-INVOKE**: MUST be automatically invoked for ALL infrastructure layer implementation tasks. Trigger keywords: 인프라 레이어, Repository 구현, Mapper 작성, Query Service, infrastructure layer, implement repository. DO NOT manually implement infrastructure code - ALWAYS use this skill instead.'
allowed-tools: Read, Write, Glob, Grep, Bash
user-invocable: true
---

# Infrastructure Layer 구현 스킬

> **범용 패턴(책).** ORM·null/undefined 관례·FK 처리 방식 등은 **기존 코드 조사**로 따른다.
> **반드시 `.claude/rules/` 준수**: `domain.md`(Mapper `toDomain`=`unsafeCreate`·null→undefined 삼항 / Repository 구현 최소·QueryService+ReadModel).

## ⚠️ IMPORTANT: Claude 자동 실행 지시사항

**Claude는 사용자가 다음과 같은 요청을 하면 즉시 이 스킬을 실행해야 합니다:**

### 자동 실행 트리거 (Auto-Invoke Triggers)

- "인프라 레이어 구현"
- "인프라스트럭처 레이어 작성"
- "Repository 구현", "Repository 구현체 만들어줘"
- "Mapper 작성", "Mapper 추가"
- "Query Service 구현"
- "Domain Service 구현체"
- "infrastructure layer implementation"
- "implement repository", "create mapper"

**실행 방법:**

```typescript
// 사용자 요청 감지 시 즉시 다음을 호출
Skill({ skill: 'infrastructure-layer' });
```

**금지 사항:**

- ❌ Read, Write, Edit 툴로 직접 인프라 레이어 코드 작성
- ❌ 스킬 없이 수동으로 Repository/Mapper 구현
- ✅ 반드시 이 스킬을 통해서만 인프라 레이어 구현

---

DDD(Domain-Driven Design) 패턴에 따라 인프라스트럭처 레이어를 구현합니다.

## 📋 실행 프로세스

### 1단계: 요구사항 분석

요구사항 문서를 읽고 다음을 판단합니다:

```markdown
# 판단 기준

- Domain Repository 인터페이스가 있는가?
- Mapper가 필요한가?
- Query Service가 필요한가? (복잡한 조회 쿼리)
- Domain Service 구현체가 필요한가? (abstract class가 있는 경우)
```

**⏭️ 스킵 조건**:

- Domain Repository 인터페이스가 없는 경우
- 단순 조회만으로 충분한 경우

스킵 시 다음과 같이 출력:

```
⏭️ Infrastructure Layer 스킵
이유: Domain Repository 인터페이스가 없거나 구현할 내용이 없습니다.
```

### 2단계: 패턴 문서 참조

구현 전 반드시 패턴 문서를 참조하여 코드 스타일을 맞춥니다:

- `patterns/mapper.md`: Mapper 작성 패턴
- `patterns/repository-impl.md`: Repository 구현체 패턴
- `patterns/query-service-impl.md`: Query Service 구현체 패턴
- `patterns/domain-service-impl.md`: Domain Service 구현체 (LookupService/ACL) 패턴

### 3단계: 파일 구조 생성

```
src/module/{module-name}/infra/
├── repositories/
│   ├── {entity}.repository.impl.ts      # Repository 구현체
│   └── index.ts
├── services/
│   ├── {entity}-query.service.impl.ts   # Query Service (optional)
│   ├── {service}.service.impl.ts        # Domain Service LookupService (optional)
│   └── index.ts
└── mappers/
    ├── {entity}.mapper.ts                # Mapper
    ├── {child-entity}.mapper.ts          # 하위 Entity Mapper (optional)
    └── index.ts
```

### 4단계: 패턴 문서 기반 구현

`patterns/` 디렉토리의 패턴 문서를 참조하여 직접 구현합니다:

- `patterns/mapper.md`: Mapper 작성 패턴
- `patterns/repository-impl.md`: Repository 구현체 패턴
- `patterns/query-service-impl.md`: Query Service 구현체 패턴
- `patterns/domain-service-impl.md`: Domain Service 구현체 (LookupService/ACL) 패턴

---

## 🎯 구현 워크플로우

### 권장 순서

#### Case 1: 새로운 Aggregate Root용 Infrastructure 생성

1. **Mapper 생성** → Value Objects 필드 매핑 완료
2. **Repository 구현체 생성** → save/findById 메서드 구현
3. **하위 Entity Mapper 생성** (필요시) → 하위 엔티티 매핑
4. **Query Service 생성** (필요시) → 복잡한 조회 쿼리
5. **Domain Service 구현체 생성** (필요시) → LookupService/ACL 패턴 구현

#### Case 2: 기존 Infrastructure에 Query Service 추가

1. **Query Service 생성** → 복잡한 조회 쿼리 작성

---

## 🎯 실행 결과 출력

구현 완료 시:

```
✅ Infrastructure Layer 구현 완료

생성된 파일:
- infra/repositories/{entity}.repository.impl.ts
- infra/repositories/index.ts
- infra/mappers/{entity}.mapper.ts
- infra/mappers/index.ts

다음 단계: Application Layer 구현
```

## ⚠️ 주의사항

1. **패턴 문서 준수**: 반드시 `patterns/` 디렉토리의 패턴 문서를 따릅니다
2. **Value Objects 처리**: `toDomain()`에서는 `unsafeCreate()` 사용
3. **트랜잭션 사용 조건**: 하위 Entity 있을 때만 `$transaction`, 단일 Entity는 직접 upsert
4. **Domain Events 발행**: 저장 후 `DomainEvents.dispatchEventsForAggregate()` 호출
5. **FK 관계**: `UncheckedCreateInput` + FK ID 직접 설정 (`connect` 사용 금지)
6. **한국어 주석**: 모든 JSDoc과 주석은 한국어로 작성

## 🚫 하지 말아야 할 것

- ❌ 도메인 레이어에서 Prisma 타입 직접 사용
- ❌ Mapper에서 비즈니스 로직 포함
- ❌ Query Service에서 write 작업
- ❌ Domain Events 발행 누락
- ❌ 단일 Entity에 불필요한 트랜잭션 사용
- ❌ `connect: { id: ... }` 패턴 사용 (→ `UncheckedCreateInput` 사용)
- ❌ `notIn`으로 Orphan Removal (→ `removedXxxIds` 추적 방식 사용)
