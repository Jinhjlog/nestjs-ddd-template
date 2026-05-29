# 스크립트

| 명령                             | 언제                                           |  횟수   |
| -------------------------------- | ---------------------------------------------- | :-----: |
| `npm run bootstrap`              | 템플릿 복제 직후 — 프로젝트명·DB·git 초기화    |   1회   |
| `bash scripts/setup-worktree.sh` | G 자동화 — 워크트리 셋업 (오케스트레이터 전용) | API마다 |

---

## `npm run bootstrap` — 프로젝트 부트스트랩 (대화형)

템플릿을 복제한 직후 1회 실행합니다. 대화형으로 다음을 처리합니다.

```bash
npm run bootstrap          # 대화형
npm run bootstrap -- --dry # 변경 없이 미리보기
npm run bootstrap -- --yes # 프롬프트 자동 진행(기본값)
```

1. **프로젝트 이름** (kebab-case) → `package.json` name + `docker-compose`의 컨테이너명(`<이름>-mariadb`) 치환
2. **프로젝트 설명** → `package.json` description 치환
3. **`.env.development` 생성** — 없을 때만 `.env.example`에서 복사 (기존 파일은 건드리지 않음)
4. **git 히스토리 초기화** (선택) — 템플릿 커밋을 지우고 새 `git init` + 첫 커밋

> `.env.development`가 이미 있으면 손대지 않습니다. 시크릿 값은 생성 후 직접 채우세요.

---

## `bash scripts/setup-worktree.sh` — G 자동화 워크트리 셋업

G 단계(API별 병렬 구현)에서 **오케스트레이터(Opus)가** `git worktree add` 직후 1회 실행합니다. `git worktree`는 git이 추적하는 파일만 체크아웃하므로, 비추적 자원(`node_modules` / `generated` Prisma 클라이언트 / `.env*`)을 공급해야 워크트리 안에서 `lint`·`build`가 동작합니다.

```bash
bash scripts/setup-worktree.sh <worktree-path> [main-repo-path]
# 예) git worktree add ../wt/feat-orders-list -b feat/orders-list 직후
bash scripts/setup-worktree.sh ../wt/feat-orders-list
```

| 자원                            | 방식   | 이유                                        |
| ------------------------------- | ------ | ------------------------------------------- |
| `node_modules`                  | 심링크 | 의존성 동일 전제 — 복제 회피                |
| `generated` (Prisma 클라이언트) | 심링크 | 스키마 동일 전제 — `@prisma/generated` 해석 |
| `.env*`                         | 복사   | 워크트리별 격리                             |

> 메인 레포 경로(2번째 인자)는 생략 시 스크립트 위치 기준으로 자동 추정합니다. 워크트리 생성·셋업·정리 주체와 전체 절차는 [`docs/dev-process.md`](./dev-process.md)의 **G 자동화** 참조.
