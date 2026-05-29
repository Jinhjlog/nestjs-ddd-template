---
name: commit-bot
description: 'Clean Architecture 레이어별 구조화된 Git 커밋 생성. 변경 사항을 분석하여 레이어 순서대로 분리 커밋. "커밋", "commit", "커밋 만들어줘" 키워드 사용 시 실행.'
user-invocable: true
---

# Git Commit 스킬 (Clean Architecture)

> **범용 패턴(책).** 커밋 메시지 언어·이모지·작성자 표기 정책은 **기존 로그 조사**로 그 프로젝트 관례를 따른다.
> **`.claude/rules/git-workflow.md`가 SSOT** (브랜치/커밋/PR 규칙). 이 스킬은 그 운영 디테일(레이어별 분리·순서)을 담는다. 머지는 절대 금지(사람).

## IMPORTANT: Claude 자동 실행 지시사항

**Claude는 사용자가 다음과 같은 요청을 하면 이 스킬 사용을 고려해야 합니다:**

### 실행 트리거 (Invoke Triggers)

- "커밋 해줘", "커밋 만들어줘"
- "변경사항 커밋", "레이어별 커밋"
- "commit", "git commit"
- "커밋 분리해줘"

**실행 방법:**

```typescript
// 사용자 요청 감지 시 다음을 호출
Skill({ skill: 'commit-bot' });
```

**권장 사항:**

- ✅ 여러 레이어에 걸친 변경사항을 커밋할 때 이 스킬 사용 권장
- ✅ 기능 구현 완료 후 정리된 커밋이 필요할 때 사용
- ⚠️ 단일 파일 수정은 직접 커밋도 가능

---

Clean Architecture 레이어별로 변경사항을 분석하고 구조화된 커밋을 생성합니다.

## 절대 금지 사항

- **레이어 혼합 커밋**: 하나의 커밋에 여러 레이어 포함 금지
- **일괄 커밋**: 모든 변경사항을 한 커밋에 넣기 금지
- **모호한 메시지**: "WIP", "fix", "update" 단독 사용 금지
- **작성자 표기**: 커밋/PR의 AI·Co-Authored-By 표기 **정책은 프로젝트 관례를 조사**해 따른다 (금지하는 프로젝트도, 요구하는 프로젝트도 있음 — rules/git-workflow).
- **자동 push**: push는 절대 수행하지 않음 (사용자 요청 또는 G 자동화 규칙에 한함). 머지는 항상 사람.

## 커밋 메시지 형식

### 이모지 규칙

```
✨ feature: description       - 새 기능
🔧 config/module: description - 설정 또는 모듈 변경
🎨 style/db: description      - 코드 스타일 또는 DB 변경
🐛 bugfix: description        - 버그 수정
♻️ refactor: description      - 코드 리팩토링
📝 docs: description          - 문서 변경
🔥 removal: description       - 코드/파일 삭제
```

### 레이어 프리픽스

```
✨ domain: description        - 도메인 레이어
✨ infra: description         - 인프라 레이어
✨ application: description   - 애플리케이션 레이어
✨ presentation: description  - 프레젠테이션 레이어
🔧 module: description        - 모듈 설정
📝 docs: description          - 문서
```

### 메시지 구조

```
<이모지> <레이어>: <간결한 요약>

- 변경사항 1
- 변경사항 2
- 변경사항 3
```

- 첫 줄: 50자 이내 간결한 요약
- 본문: 주요 변경사항 bullet point
- 한국어로 작성

## 📋 실행 프로세스

### 1단계: 최근 커밋 패턴 확인

```bash
git log --oneline -20
```

프로젝트의 기존 커밋 스타일을 확인하여 일관성을 유지합니다.

### 2단계: 변경사항 확인

**반드시 모든 변경사항을 확인한 후 커밋합니다.**

```bash
git status
git diff
git diff --cached
git ls-files --others --exclude-standard
```

### 3단계: 레이어별 파일 분류

변경된 파일을 레이어별로 분류합니다:

| 레이어         | 경로 패턴                                                                       |
| -------------- | ------------------------------------------------------------------------------- |
| Domain         | `domain/models/`, `domain/repositories/`, `domain/services/`, `domain/events/`  |
| Infrastructure | `infra/repositories/`, `infra/mappers/`, `infra/services/`                      |
| Application    | `application/usecases/`, `application/dtos/`, `application/events/`             |
| Presentation   | `presentation/controllers/`, `presentation/dtos/`, `presentation/transformers/` |
| Module         | `*.module.ts`, `index.ts` (barrel exports)                                      |
| Docs           | `docs/`, `*.md`                                                                 |

### 4단계: 레이어 순서대로 커밋

**커밋 순서 (반드시 준수):**

1. Domain Layer
2. Infrastructure Layer
3. Application Layer
4. Presentation Layer
5. Module Configuration
6. Docs (있는 경우)

```bash
# 1. Domain Layer
git add <domain-files>
git commit -m "$(cat <<'EOF'
✨ domain: <기능> 도메인 모델 정의

- 주요 변경사항 1
- 주요 변경사항 2
EOF
)"

# 2. Infrastructure Layer
git add <infra-files>
git commit -m "$(cat <<'EOF'
✨ infra: <기능> 레포지토리 구현

- 주요 변경사항 1
- 주요 변경사항 2
EOF
)"

# 3. Application Layer
git add <application-files>
git commit -m "$(cat <<'EOF'
✨ application: <기능> 유즈케이스 구현

- 주요 변경사항 1
- 주요 변경사항 2
EOF
)"

# 4. Presentation Layer
git add <presentation-files>
git commit -m "$(cat <<'EOF'
✨ presentation: <기능> API 구현

- 주요 변경사항 1
- 주요 변경사항 2
EOF
)"

# 5. Module Configuration
git add <module-files>
git commit -m "$(cat <<'EOF'
🔧 module: <기능> 모듈 의존성 설정

- 주요 변경사항 1
- 주요 변경사항 2
EOF
)"
```

### 5단계: 검증

```bash
git log --oneline -10
git status
```

커밋 로그를 확인하고 working tree가 깨끗한지 검증합니다.

## 레이어별 커밋 메시지 템플릿

### Domain Layer

```
✨ domain: <기능> 도메인 모델 정의

- <Entity> 엔티티 추가
- <Repository> 인터페이스 정의
- <ValueObject> 값 객체 추가
- 비즈니스 규칙 구현
```

### Infrastructure Layer

```
✨ infra: <기능> 레포지토리 구현

- <Repository>Impl에 <method> 메서드 구현
- <Mapper> 매퍼 추가
- 데이터베이스 연동 로직 구현
```

### Application Layer

```
✨ application: <기능> 유즈케이스 구현

- <UseCase> 유즈케이스 추가
- <Dto> DTO 추가
- 검증 로직 구현
```

### Presentation Layer

```
✨ presentation: <기능> API 구현

- <Controller>에 <method> 엔드포인트 구현
- Swagger 문서화 작성
- Request/Response DTO 정의
```

### Module Configuration

```
🔧 module: <기능> 모듈 의존성 설정

- <Module>에 <UseCase> provider 등록
- <CoreModule> import 추가
```

## 특수 케이스

### 버그 수정

```
🐛 bugfix: <레이어>: <문제> 수정

- 문제 설명
- 수정 내용
- 영향 범위
```

### 리팩토링

```
♻️ refactor: <레이어>: <대상> 리팩토링

- 변경 이유
- 개선 사항
```

### 설정 변경

```
🔧 config: <설정명> 설정 추가/수정

- 변경 내용
- 변경 이유
```

### Amend (마지막 커밋 수정)

```bash
# 조건 확인 (push 안 된 커밋만)
git log -1 --format='%an %ae'
git status

# 메시지만 수정
git commit --amend -m "$(cat <<'EOF'
✨ infra: 수정된 커밋 메시지

- 수정된 내용
EOF
)"

# 파일 추가 후 amend
git add <forgotten-file>
git commit --amend --no-edit
```

**주의**: push되지 않은 본인의 커밋에만 사용합니다.

## 🎯 실행 결과 출력

모든 커밋 완료 시:

```
✅ 커밋 완료

생성된 커밋:
1. ✨ domain: <기능> 도메인 모델 정의
2. ✨ infra: <기능> 레포지토리 구현
3. ✨ application: <기능> 유즈케이스 구현
4. ✨ presentation: <기능> API 구현
5. 🔧 module: <기능> 모듈 의존성 설정

## 추천 PR 제목

✨ <기능 요약>
```

## PR 제목 추천

커밋 완료 후 PR 제목을 제안합니다:

```
<이모지> <기능 요약>
```

**예시:**

```
✨ 카테고리 생성 기능 구현
✨ 추천 상품 CRUD API 구현
🐛 사용자 인증 토큰 만료 버그 수정
♻️ 주문 모듈 레포지토리 리팩토링
```

## 완료 전 체크리스트

- [ ] 최근 커밋 로그 확인으로 패턴 일관성 확인?
- [ ] 변경사항을 레이어별로 분류했는가?
- [ ] Clean Architecture 레이어 순서 준수?
- [ ] 각 커밋이 단일 레이어만 포함?
- [ ] 커밋 메시지가 명확하고 간결한가?
- [ ] 올바른 이모지와 레이어 프리픽스 사용?
- [ ] 본문이 bullet point로 작성?
- [ ] 모든 커밋 후 working tree가 깨끗한가?

## 주의사항

1. **레이어 순서 준수**: Domain -> Infra -> Application -> Presentation -> Module (해당 배치에 존재하는 레이어만)
2. **메시지 언어**: 기존 로그 관례 따름 (이 레포는 한국어)
3. **push 금지**: 커밋만 수행, push/머지는 사람 (G 자동화는 push+PR까지, 머지 금지)
4. **작성자 표기**: 프로젝트 관례 조사 (rules/git-workflow)
5. **git status 확인**: 커밋 전후로 반드시 상태 확인
