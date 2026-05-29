# NestJS DDD Template

NestJS + DDD(Domain-Driven Design) + Clean Architecture 기반 백엔드 템플릿.
레이어 경계, 검증 책임(VO), CQRS(Repository/QueryService), Port/Adapter 추상화를 일관된 패턴으로 정리했고,
Claude Code 스킬·룰·서브에이전트로 **AI 에이전트 기반 개발 프로세스**를 함께 담았습니다.

## 빠른 시작

```bash
git clone <이 레포 URL> my-project
cd my-project
npm install

# 부트스트랩 (대화형): 프로젝트명 변경 + .env 생성 + (선택) git 초기화
npm run bootstrap

# DB 시작 + 마이그레이션 + 시드
npm run docker:up:dev
npm run prisma:migrate:dev
npm run prisma:seed:dev prisma/seed-admins.ts

# 개발 서버
npm run start:dev
```

- API: http://localhost:3000
- Swagger: http://localhost:3000/docs
- 기본 관리자 계정: `admin` / `Test@123`

> `npm run bootstrap`이 프로젝트명·`.env.development`·git 초기화를 처리합니다. 생성된 `.env.development`의 DB·JWT 시크릿 값은 직접 채우세요.

---

## 주요 명령어

```bash
# 개발
npm run start:dev              # 개발 서버 (watch mode)
npm run build                  # 빌드

# 코드 품질
npm run lint                   # ESLint
npm run format                 # Prettier

# 테스트
npm test                       # 유닛 테스트
npm run test:e2e               # E2E 테스트 (Testcontainers MariaDB)

# 데이터베이스
npm run prisma:migrate:dev     # 마이그레이션 생성 + 실행
npm run prisma:studio:dev      # Prisma Studio (DB GUI)

# Docker
npm run docker:up:dev          # MariaDB 시작
npm run docker:down:dev        # MariaDB 종료

```

스크립트 상세: [docs/setup-scripts.md](docs/setup-scripts.md)

---

## 기술 스택

| 구분      | 선택                                  |
| --------- | ------------------------------------- |
| Runtime   | Node.js + NestJS 11                   |
| Language  | TypeScript                            |
| Database  | MariaDB + Prisma ORM                  |
| Auth      | JWT (Access + Refresh Token Rotation) |
| API Docs  | Swagger (OpenAPI)                     |
| Testing   | Jest + Testcontainers (E2E)           |
| Container | Docker + Docker Compose               |

---

## 아키텍처

DDD 4계층(domain / application / infra / presentation)을 모듈마다 동일하게 적용합니다.
그 위에 통합 패턴(QueryService / LookupService / Port·Adapter / OHS)을 필요할 때만 얹습니다.
Port/OHS의 실제 구현은 `file-upload` 모듈이 레퍼런스입니다.

### 포함된 예시 모듈

| 모듈        | 설명                                                         |
| ----------- | ------------------------------------------------------------ |
| Admin       | 관리자 로그인/로그아웃/토큰갱신 (JWT)                        |
| User        | 사용자 인증 (JWT, Refresh Token Rotation)                    |
| File Upload | Presigned URL → confirm 플로우, Port/Adapter + OHS 패턴 실증 |
| Health      | DB/메모리/디스크 헬스체크                                    |

각 모듈이 DDD 4계층 + 통합 패턴의 실제 구현 예시입니다. 새 모듈은 이 구조를 참조해 `.claude/skills/`의 레이어별 패턴으로 구현합니다.

---

## AI 에이전트 기반 개발

이 템플릿은 Claude Code로 DDD 백엔드를 일관되게 개발하기 위한 설정을 포함합니다.
(아래는 사람이 읽는 문서가 아니라 **에이전트(Claude Code)가 읽는** 진입점·규칙입니다.)

- **[CLAUDE.md](CLAUDE.md)** — Claude Code가 자동 로드하는 에이전트 진입점. 아래 rules와 dev-process를 가리킨다.
- **`.claude/rules/`** — 항상 준수하는 범용 규칙 (컨벤션·검증·도메인·git·위임·모델). 고유값은 고정하지 않고 "조사해서 따름".
- **`.claude/skills/`** — 레이어별 구현 패턴 책 (domain / infrastructure / application / presentation-layer, e2e-patterns, swagger-bot, commit-bot).
- **`.claude/agents/`** — 격리 실행 서브에이전트 (`api-implementer`, `convention-reviewer`).
- **[docs/dev-process.md](docs/dev-process.md)** — Contract-First + TDD 개발 절차, 검토 게이트, 병렬 G 자동화.

핵심 원칙: **판단은 사람, 실행은 에이전트. 컨벤션은 고정하지 말고 조사한다.**

---

## 문서

| 문서                                           | 설명                         |
| ---------------------------------------------- | ---------------------------- |
| [docs/dev-process.md](docs/dev-process.md)     | AI 에이전트 개발 프로세스    |
| [docs/setup-scripts.md](docs/setup-scripts.md) | 부트스트랩·워크트리 스크립트 |
| [docs/databases/](docs/databases/)             | 테이블 명세                  |
| [docs/features/](docs/features/)               | 모듈별 SPEC                  |
| [docs/e2e/GUIDE.md](docs/e2e/GUIDE.md)         | E2E 테스트 작성 가이드       |
