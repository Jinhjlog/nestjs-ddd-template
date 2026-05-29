# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Language Guidelines

**답변 언어**: 모든 응답과 커뮤니케이션은 한국어로 작성하세요.

## 개발 규칙 (Rules) — 반드시 준수

작업 시 `.claude/rules/`의 규칙을 **항상 따른다.** (범용 규칙 — 프로젝트 고유값은 "조사해서 따름")

- `.claude/rules/conventions.md` — 컨벤션 원칙 (조사형·검증=VO·응답 스키마 격리·지역성>DRY)
- `.claude/rules/validation.md` — 검증=VO 책임 (DTO는 타입 가드만)
- `.claude/rules/domain.md` — YAGNI·Repository 최소·Mapper·null↔undefined
- `.claude/rules/git-workflow.md` — 브랜치/커밋/PR 규칙 (머지는 사람)
- `.claude/rules/agents.md` — 서브에이전트 위임 규칙 (G 자동화)
- `.claude/rules/performance.md` — 모델 선택(Opus/Sonnet)·컨텍스트 관리

전체 개발 프로세스(단계·검토 게이트·Contract-First+TDD·G 자동화)는 **[`docs/dev-process.md`](docs/dev-process.md)** 를 따른다.

## 스킬 (Skills)

레이어별 구현은 `.claude/skills/`의 패턴 책을 참조한다 (자동 실행 트리거 보유).

- `domain-layer` / `infrastructure-layer` / `application-layer` / `presentation-layer` — DDD 레이어별 구현 패턴
- `e2e-patterns` — E2E 계약 테스트 작성 패턴 (조사형)
- `swagger-bot` — Swagger 데코레이터 작성
- `commit-bot` — 레이어별 분리 커밋

## Development Commands

### Build and Run

```bash
npm run build              # Build the application
npm run start              # Start in production mode
npm run start:dev          # Start in development mode with file watching
npm run start:debug        # Start with debugging enabled
```

### Code Quality

```bash
npm run lint               # Run ESLint with auto-fix
npm run format             # Format code with Prettier
```

### Testing

```bash
npm test                   # Run unit tests
npm run test:watch         # Run tests in watch mode
npm run test:cov           # Run tests with coverage report
npm run test:e2e           # Run end-to-end tests (Testcontainers MariaDB)
```

### Database Management

```bash
npm run docker:up:dev        # Start local MariaDB (docker compose)
npm run prisma:generate      # Generate Prisma client
npm run prisma:migrate:dev   # Create and run new migration
npm run prisma:seed:dev      # Seed database with initial data
```

## Architecture Overview

### Domain-Driven Design (DDD) Structure

The codebase follows Clean Architecture with DDD principles. Each module has 4 layers:

```
src/module/<module>/
├── domain/           # Business logic and entities
│   ├── models/       # Domain entities, Value Objects, Read Models
│   ├── repositories/ # Repository interfaces (abstract class)
│   └── services/     # Domain services, QueryService/LookupService interfaces
├── application/      # Use cases and application services
│   ├── usecases/     # Business use cases
│   ├── dtos/         # Application DTOs
│   ├── ports/        # Driven Ports — 기술 추상화 (Storage 등)
│   └── ohs/          # Open Host Service — BC 간 공개 API 계약
├── infra/            # Infrastructure layer
│   ├── repositories/ # Repository implementations (Prisma)
│   ├── adapters/     # Port 구현체 (Mock 등)
│   ├── ohs/          # OHS 구현체
│   ├── mappers/      # Domain ↔ persistence mapping
│   └── services/     # QueryService, LookupService (읽기 전용)
└── presentation/     # API layer
    ├── controllers/  # REST controllers (역할별 분리)
    ├── dtos/         # Request/Response DTOs
    └── transformers/ # ReadModel → Response DTO 변환
```

### Integration Patterns

- **Port** (`application/ports/` → `infra/adapters/`): 기술 추상화 — 예: `FileStoragePort` ↔ Adapter. DB·인프라를 갈아껴도 도메인은 불변.
- **OHS** (`application/ohs/` → `infra/ohs/`): BC 간 공개 API 계약.
- **QueryService** (`infra/services/`): 읽기 전용 Prisma 쿼리 (ReadModel 반환, CQRS의 읽기 측).
- **LookupService** (`infra/services/`): 타 BC 엔티티 존재 확인.

### Example Modules

- `admin` / `user` — JWT 기반 인증 (각각 auth, auth-guard 모듈 분리) + 도메인
- `file-upload` — Presigned URL 발급 → confirm 플로우. Port/Adapter(스토리지) + OHS 패턴 실증
- `core` — 데이터베이스, JWT, 로거, 설정 등 공용 인프라

### Core Infrastructure Components

#### Domain Foundation (`src/lib/domain/`)

- `AggregateRoot`: Base class for domain aggregates
- `Entity`: Base class for domain entities
- `UniqueEntityId`: Value object for entity identification
- `ValueObject`: Base class for value objects
- `value-objects/`: 내장 VO (BoundedString, Email, Phone, Integer, PositiveNumber 등)

#### Shared Components (`src/shared/`)

- **Exception Handling**: Global exception filter with custom domain exceptions

### Database Architecture

- **ORM**: Prisma with MariaDB/MySQL
- **테스트 DB**: Testcontainers (MariaDB) — e2e는 컨테이너로 격리 실행

## Path Aliases

```typescript
"@lib/*": ["./src/lib/*"]                    # Domain foundation classes
"@core/*": ["./src/module/core/*"]           # Core infrastructure (database, jwt, logger)
"@shared/*": ["./src/shared/*"]              # Shared utilities, exceptions, decorators
"@prisma/generated/*": ["./generated/prisma/*"]  # Prisma client
"src/*": ["./src/*"]
```

## Environment Configuration

환경별 `.env` 파일:

| 파일               | 용도       |
| ------------------ | ---------- |
| `.env.development` | 로컬/개발  |
| `.env.test`        | E2E 테스트 |
