# Rules: API 응답·에러 표준 (SSOT)

> 이 프로젝트의 **성공 응답 / 에러 응답 / 검증 / 예외 설계**의 고정 표준.
> conventions.md §1의 "응답 래퍼·에러 형태"는 더 이상 조사 대상이 아니라 **이 문서로 확정**된다.

## 0. 대원칙

- **성공 = 리소스 그대로**(래퍼 없음). **실패 = RFC 9457 `application/problem+json`**.
- **HTTP 상태코드를 진짜로 사용** — "항상 200 + body에 success=false" 금지.
- 클라이언트는 **`code`로 분기**한다. `title`/`detail`은 사람용(파싱 금지).
- **도메인/애플리케이션 예외는 HTTP를 모른다** — `ErrorCategory`만 보유, HTTP 매핑은 **예외 필터(어댑터)에서만**.

## 1. 성공 응답 (`application/json`)

| 종류 | 형태 | 코드 |
| --- | --- | --- |
| 단건 | 리소스 객체 그대로 `{ id, ... }` | 200 |
| 목록(오프셋) | `{ items, totalCount, totalPages, currentPage }` | 200 |
| 목록(커서) | `{ items, nextCursor, hasNext }` | 200 |
| 생성 | 리소스 | 201 |
| 수정/상태변경 | 리소스 | 200 |
| 본문 불필요 | (body 없음) | 204 |

- 응답 봉투(`{ data, meta }`)를 쓰지 않는다 — 9457(평면 에러)과 짝이 맞는 "raw 성공"이 표준.

## 2. 에러 응답 (`application/problem+json`) — RFC 9457

```jsonc
{
  "type": "about:blank",       // 표준. 에러 문서 페이지가 생기면 URL로 교체
  "title": "Not Found",        // 표준. type=about:blank이면 HTTP 상태 문구
  "status": 404,               // 표준
  "detail": "User ID 01H... 항목을 찾을 수 없습니다", // 표준. 이번 발생 건(사람용)
  "instance": "/api/v1/admin/users/01H...",          // 표준. 이 요청 경로
  "code": "USER_NOT_FOUND",    // 확장 ⭐ 클라 분기키 (SCREAMING_SNAKE_CASE)
  "errors": [ ... ],           // 확장 (검증 시에만, §3)
  "requestId": "9f1c...",      // 확장
  "timestamp": "2026-06-16T03:12:00.000Z"            // 확장
}
```

- 구현은 라이브러리 없이 전역 `AllExceptionsFilter`가 생성. 헤더 `Content-Type: application/problem+json`.
- 미처리 예외 → `status 500`, `code: INTERNAL_SERVER_ERROR`, `type: about:blank`.

## 3. 검증 에러 (400) — 두 모양 (fail-fast, 집계 안 함)

400은 **발생원에 따라 두 모양**이며, 둘의 `code` 집합은 **겹치지 않는다(disjoint)**.

**(A) 요청 형식 검증 실패 — DTO 타입가드** → `code: VALIDATION_FAILED` + `errors[]` 다건:
```jsonc
"errors": [
  { "name": "loginId",  "code": "REQUIRED",     "detail": "loginId should not be empty" },
  { "name": "password", "code": "INVALID_TYPE", "detail": "password must be a string" }
]
```
- `errors[]`에 들어가는 `code`는 **타입가드 코드뿐**: `REQUIRED`·`INVALID_TYPE`·`INVALID_VALUE`·`OUT_OF_RANGE`·`INVALID`. (`validation.ts`의 `CONSTRAINT_CODE` 매핑)
- `detail`은 class-validator 기본 메시지(영문). 각 항목: `name`(필드, 중첩 `a.b`) · `code` · `detail`.
- `ValidationPipe.exceptionFactory`(`validationExceptionFactory`)가 생성. **class-validator는 배치 검증이라 다건이 자연스럽다.**

**(B) 값 검증 실패 — VO 단건** → 구체 `code` + `detail`, **`errors[]` 없음**:
```jsonc
{ "status": 400, "code": "PASSWORD_TOO_SHORT", "detail": "비밀번호는 8자 이상이어야 합니다", ... }
```
- 길이·형식·범위·enum 같은 **값 규칙은 전부 여기**(VO). 예: `PASSWORD_TOO_SHORT`, `INVALID_EMAIL_FORMAT`, `LOGIN_ID_TOO_LONG`.
- **fail-fast 단건**: VO는 첫 위반에서 throw → 한 번에 하나. (집계(Notification)·수집기 없음. `code`가 필드+규칙을 식별.)

> ⚠️ **형식/길이 코드를 `errors[]`에 넣지 않는다.** `errors[]`(A)는 "필드가 형식상 잘못 왔다"(타입가드), VO 단건(B)은 "값이 규칙 위반"(비즈니스) — 책임·코드 집합이 다르다. (이메일 형식 오류는 `@IsEmail`이 아니라 Email VO → (B))

## 4. 예외 설계 — 카테고리 기반 (HTTP 무관)

`@shared/exception`:

- `ErrorCategory` enum — 전송 무관 카테고리. **도메인 예외는 이것만 안다.**
- `BaseException { category, code, message, errors? }` — `HttpStatus` 미보유.
- 예외 필터가 **카테고리 → HTTP** 매핑(이 매핑이 HTTP를 아는 유일한 곳):

| ErrorCategory | HTTP | 예외 |
| --- | --- | --- |
| `VALIDATION` | 400 | **ValueObjectValidationException**(VO 값 단건 `{code,detail}`) · **RequestValidationException**(DTO 다건 `errors[]`) |
| `UNAUTHENTICATED` | 401 | **AuthenticationException** |
| `FORBIDDEN` | 403 | AuthorizationException |
| `NOT_FOUND` | 404 | EntityNotFoundException |
| `CONFLICT` | 409 | DuplicateEntityException · ConcurrentUpdateException |
| `RULE_VIOLATION` | **422** | DomainRuleViolationException (상태/불변식·**연산 규칙** 위반 — 예: 이미 활성, 0나눗셈·음수 결과. §3(B) 입력 값검증(400)과 구분) |
| `INTERNAL` | 500 | InternalException(서버측 실패 — 토큰 서명 실패·JWT 인프라 오류 등. **인증 실패 401과 구분**) · (미처리 예외) |
| `UNAVAILABLE` | 503 | (외부 의존 불가) |

- **단일 세트** — 레이어(domain/infra/presentation)로 나누지 않고 **의미(카테고리) 기준**. 인증은 `AuthenticationException` 하나, 값 단건 검증은 `ValueObjectValidationException` 하나.
- **새 예외는 HttpStatus를 import하지 않는다** → 적절한 `ErrorCategory` 지정.
- `code`: `EntityNotFound`·`DomainRuleViolation` 등은 `errorCode`로 구체화(기본값 보유). `ValueObjectValidationException`은 `{ code, detail }`로 **code 필수**(값+규칙 식별, 예 `PASSWORD_TOO_SHORT`).

## 5. errorCode 네이밍

- **SCREAMING_SNAKE_CASE**. 도메인 의미를 담아 구체적으로(`EMAIL_ALREADY_EXISTS`, `FILE_NOT_CONFIRMED`).
- VO는 `{FIELD}_{사유}` 형태(예: `NAME_TOO_LONG`) — VO 구현의 코드 생성 규칙을 따른다(swagger-bot).
- ⚠️ **제네릭 VO(BoundedString/Integer/PositiveNumber 등)의 `fieldName`은 코드의 일부**가 된다(`${FIELD}_TOO_LONG`). 따라서 **`fieldName`은 ASCII**로 준다(`loginId` ○ / `'입점사 이름'` ✗ → code에 한글 혼입). 한글 라벨이 필요하면 메시지(detail)에만.

## 6. 클라이언트 계약

**항상 `code`로 분기.** 400은 두 모양이지만 규칙은 단순하다 — `VALIDATION_FAILED`면 `errors[]`를 읽고, 그 외(VO 단건 400 포함)는 `code` 하나로 분기:

```ts
if (res.ok) return res.json();          // 성공: 리소스 그대로
const p = await res.json();             // 실패: problem+json
switch (p.code) {                       // message 아닌 code로 분기
  case 'VALIDATION_FAILED':             // §3(A) DTO 타입가드 다건
    showFieldErrors(p.errors);          //  → errors[] 순회 (REQUIRED/INVALID_TYPE…)
    break;
  case 'PASSWORD_TOO_SHORT':            // §3(B) VO 값검증 단건 (errors 없음)
  case 'INVALID_EMAIL_FORMAT':
    showError(p.code, p.detail);
    break;
  case 'USER_NOT_FOUND':                // 404 등 그 외도 동일하게 code로
    ...
}
```

- **규칙**: `code === 'VALIDATION_FAILED'` ⇒ `errors[]` 존재(타입가드 다건). 그 외 모든 코드는 단건(errors 없음).
- 두 400 코드 집합은 disjoint라 같은 에러가 두 모양으로 오지 않는다(§3).

## 7. HttpCode (메서드별)

GET 200 · POST 201 · PATCH 200 · DELETE 204. (인증 가드의 401/403은 데코레이터 자동 부착 활용)

---

> **이 표준에 미포함(별개 결정)**: 커맨드 응답 **데이터 출처** 전략(생성/수정 후 *재조회 vs 직접 반환*)은 응답 *모양*과 별개이며 이 문서는 모양만 고정한다.
