# AI 에이전트 개발 프로세스

> DDD 백엔드 기능을 **Contract-First + TDD**로 구현하는 정식 절차. 에이전트와 사람이 따른다.
> 규칙(컨벤션·검증·git 등)은 `.claude/rules/`, 패턴은 `.claude/skills/`, 실행자는 `.claude/agents/`.

## 핵심 원칙

- **판단은 사람, 실행은 에이전트.** 문서가 코드보다 먼저(SPEC → 계약 → 코드).
- **Contract-First + TDD**: API 계약(Mock) 확정 → E2E를 RED로 먼저 → 구현으로 GREEN 견인.
- **컨벤션은 고정하지 말고 조사** (값은 프로젝트마다 다름 → 기존 코드 조사로 따름).
- **검증=VO**(DTO는 타입가드), **YAGNI**(create/unsafeCreate만, 행위 메서드는 필요 시점에).
- **보고-후-대기**: 에이전트는 실행 묶음을 중간에 질문/중단 없이 끝까지 → 완료 보고 → 대기.
- 에이전트는 기본 커밋까지(단 G 자동화는 push+PR까지). **머지는 항상 사람.**

## 진입 판정 (작업 시작 시 announce 후 진행, 추론 금지)

- **티켓 분기**: 요청에 티켓 번호/언급 有 → (가) 티켓 기반 / 無 → (나) SPEC 기반.
- **부모 브랜치**: 사용자 지정 우선 / 미지정 시 **현재 체크아웃 브랜치**.
- **작업 단위 = API 1개** (가/나 공통).
- **SSOT = SPEC**: 티켓·문서가 SPEC과 다르면 무조건 SPEC. 불일치는 `docs/features/<모듈>/dev/context-notes.md`에 기록(질문 X).

## 전체 흐름 & 검토 게이트

```
A.  SPEC 정립      → docs/features/<모듈>/SPEC.md       ── ✋ 게이트1 (사람)
B.  DB 모델링      → prisma/schema.prisma (+migration)  ── ✋ 게이트2 (사람)
B'. 티켓 생성      → (티켓 기반일 때만, 사람)

[묶음1] C·D·E 연속 실행 (중간 게이트 없음)             ── ✋ 게이트3
  C. 컨텍스트 로딩 (SPEC·스키마·기존코드 조사)
  D. API 계약 + Mock (presentation 스캐폴딩, Happy-path만)
  E. E2E 계약문서 + 테스트(RED)

[묶음2] F. Domain + Infra(공용)                        ── ✋ 게이트4

[자동화] G. API별 Application + 연동 (Opus+Sonnet 병렬)  ── 게이트 없음
I. 통합 머지 (feat → 부모 → develop, 사람)
```

> 검토 게이트는 4개(A/B/C·D·E/F)뿐. 각 게이트 = 보고-후-대기 → 사람 확정 → 다음.
> 횡단 관심사(Rate Limit·캐싱 등)는 별도 단계가 아니다 → SPEC에 담아 정규 흐름으로, 누락/비자명 시 ad-hoc 작업.

## 단계 상세 (주체 / 산출물 / 스킬·에이전트)

| 단계            | 주체                 | 산출물                                 | 스킬/에이전트                                     |
| --------------- | -------------------- | -------------------------------------- | ------------------------------------------------- |
| A SPEC          | 사람(에이전트 보조)  | `SPEC.md`                              | —                                                 |
| B DB            | 사람(에이전트 보조)  | schema + migration                     | —                                                 |
| B' 티켓         | 사람                 | 이슈 트래커 에픽/스토리/태스크         | —                                                 |
| C 컨텍스트      | 에이전트             | (조건부) `dev/context-notes.md`        | —                                                 |
| D 계약+Mock     | 에이전트             | `presentation/`, `<모듈>.module.ts`    | `presentation-layer`, `swagger-bot`               |
| E E2E(RED)      | 에이전트             | `docs/e2e/p?-*.md`, `test/e2e/*`, seed | `e2e-patterns`                                    |
| F 도메인+인프라 | 에이전트             | `domain/`, `infra/`                    | `domain-layer`, `infrastructure-layer`            |
| G API 구현      | **Opus+Sonnet 병렬** | `application/`, 연동, PR               | `application-layer` (+`api-implementer` 에이전트) |
| I 머지          | 사람                 | —                                      | —                                                 |

- **D-0 컨벤션 조사**(필수): 응답 래퍼·페이지네이션·ID타입·인증·검증위치·@ApiProperty·에러형태·파일구조·@ApiTags·IP취득 → 조사 후 진행(`rules/conventions.md`).
- **DOMAIN.md 없음**: 도메인 코드가 곧 유비쿼터스 문서. 검토는 SPEC↔코드 직접 대조.

## G 자동화 (F 이후)

- **Opus(오케스트레이터)** 1 + **Sonnet(`api-implementer`)** 최대 4 병렬. API 1개 = 워크트리 1 = 브랜치 1 = PR 1.
- 워크트리 **생성·셋업·정리 = Opus** (`scripts/setup-worktree.sh`: node_modules·generated 심링크 + .env 복사). Sonnet은 **자기 워크트리 안에서만** 작업.
- **공유 진행문서 `G_PROGRESS.md` 기록 = Opus 단독** (형식은 `rules/agents.md`). Sonnet은 결과만 반환.
- **완료 기준 = lint + build** (E2E 미실행 — 병렬 도커 충돌). Sonnet 자체 5회 재시도, 실패 시 기록만(자동 재투입 X).
- **완료만 push+PR**, 실패는 PR 없이 `code <워크트리 경로>`+이유. **머지는 사람.** 4개 완료 시 "나머지 N개?" 확인.

## 자산

- **Rules** `.claude/rules/`: conventions / validation / domain / git-workflow / agents / performance (CLAUDE.md가 참조, 항상 준수)
- **Skills** `.claude/skills/`: domain·infra·application·presentation-layer / swagger-bot / commit-bot / e2e-patterns (범용 책)
- **Agents** `.claude/agents/`: api-implementer(G 워커) / convention-reviewer(read-only)
