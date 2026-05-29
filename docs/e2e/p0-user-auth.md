# 사용자 인증 E2E 테스트 시나리오

> 우선순위: P0 | 최종 업데이트: 2026-04-13
> 관련 컨트롤러: `src/module/user/presentation/controllers/user-auth.controller.ts`

## 개요

이메일/비밀번호 기반 사용자 인증 (회원가입, 로그인, 토큰 갱신, 로그아웃) 흐름을 검증한다.

## 사전 조건 (Preconditions)

| 항목        | 설명                                |
| ----------- | ----------------------------------- |
| 인증 토큰   | 불필요 (인증 전 API)                |
| 선행 데이터 | 로그인/갱신/로그아웃: 가입된 사용자 |
| 외부 서비스 | 없음                                |

## 테스트 시나리오

### TC-UAUTH-001: 유효한 정보로 회원가입 성공

> **분류**: Happy Path
> **대상 API**: `POST /v1/user-auth/register`
> **테스트 상태**: [x] 작성완료

**Given**

- 해당 이메일로 가입된 사용자가 없음

**When**

- `POST /v1/user-auth/register` 요청
- Body: `{ "email": "test@example.com", "password": "Test1234!", "name": "홍길동", "phone": "01012345678" }`

**Then**

- 응답 상태: `200 OK`
- 응답 본문에 `accessToken`, `refreshToken` 포함
- 발급된 토큰으로 보호된 API(`GET /v1/users/me`) 호출 성공

---

### TC-UAUTH-002: 중복 이메일로 회원가입 실패

> **분류**: 핵심 비즈니스 규칙
> **대상 API**: `POST /v1/user-auth/register`
> **테스트 상태**: [x] 작성완료

**Given**

- 해당 이메일로 가입된 사용자가 존재함

**When**

- 동일 이메일로 회원가입 요청

**Then**

- 응답 상태: `409 Conflict`
- 에러 코드: `EMAIL_ALREADY_EXISTS`

---

### TC-UAUTH-003: 유효한 자격증명으로 로그인 성공

> **분류**: Happy Path
> **대상 API**: `POST /v1/user-auth/login`
> **테스트 상태**: [x] 작성완료

**Given**

- 가입된 활성 사용자가 존재함

**When**

- `POST /v1/user-auth/login` 요청
- Body: `{ "email": "test@example.com", "password": "Test1234!" }`

**Then**

- 응답 상태: `200 OK`
- 응답 본문에 `accessToken`, `refreshToken` 포함

---

### TC-UAUTH-004: 잘못된 비밀번호로 로그인 실패

> **분류**: Error Case
> **대상 API**: `POST /v1/user-auth/login`
> **테스트 상태**: [x] 작성완료

**Given**

- 가입된 사용자가 존재함

**When**

- 잘못된 비밀번호로 로그인 요청

**Then**

- 응답 상태: `401 Unauthorized`
- 에러 코드: `INVALID_CREDENTIALS`

---

### TC-UAUTH-005: 존재하지 않는 이메일로 로그인 실패

> **분류**: Error Case
> **대상 API**: `POST /v1/user-auth/login`
> **테스트 상태**: [x] 작성완료

**Given**

- 해당 이메일의 사용자가 존재하지 않음

**When**

- 존재하지 않는 이메일로 로그인 요청

**Then**

- 응답 상태: `401 Unauthorized`
- 에러 코드: `INVALID_CREDENTIALS`

---

### TC-UAUTH-006: 비활성화된 계정으로 로그인 시도

> **분류**: 핵심 비즈니스 규칙
> **대상 API**: `POST /v1/user-auth/login`
> **테스트 상태**: [x] 작성완료

**Given**

- 비활성 상태(`isActive: false`)의 사용자가 존재함

**When**

- 올바른 자격증명으로 로그인 요청

**Then**

- 응답 상태: `403 Forbidden`
- 에러 코드: `USER_ACCOUNT_INACTIVE`

---

### TC-UAUTH-007: 리프레시 토큰으로 새 토큰 발급 성공

> **분류**: Happy Path
> **대상 API**: `POST /v1/user-auth/refresh`
> **테스트 상태**: [x] 작성완료

**Given**

- 로그인하여 유효한 리프레시 토큰을 보유함

**When**

- `POST /v1/user-auth/refresh` 요청
- Body: `{ "refreshToken": "<발급받은 리프레시 토큰>" }`

**Then**

- 응답 상태: `200 OK`
- 응답 본문에 새 `accessToken`, `refreshToken` 포함
- 새 리프레시 토큰은 기존과 다름
- 부수 효과: 기존 리프레시 토큰은 DB에서 삭제됨 (일회용 rotation)

---

### TC-UAUTH-008: 이미 사용된 리프레시 토큰으로 갱신 시도

> **분류**: 핵심 비즈니스 규칙
> **대상 API**: `POST /v1/user-auth/refresh`
> **테스트 상태**: [x] 작성완료

**Given**

- 로그인 후 1회 토큰 갱신하여 기존 리프레시 토큰이 소멸됨

**When**

- 이미 사용된 리프레시 토큰으로 갱신 재시도

**Then**

- 응답 상태: `401 Unauthorized`
- 에러 코드: `REFRESH_TOKEN_NOT_FOUND`

---

### TC-UAUTH-009: 로그아웃 성공

> **분류**: Happy Path
> **대상 API**: `POST /v1/user-auth/logout`
> **테스트 상태**: [x] 작성완료

**Given**

- 로그인하여 유효한 리프레시 토큰을 보유함

**When**

- `POST /v1/user-auth/logout` 요청
- Body: `{ "refreshToken": "<발급받은 리프레시 토큰>" }`

**Then**

- 응답 상태: `204 No Content`
- 부수 효과: 로그아웃 후 해당 리프레시 토큰으로 갱신 시도 시 `REFRESH_TOKEN_NOT_FOUND` 반환
