# 관리자 인증 E2E 테스트 시나리오

> 우선순위: P0 | 최종 업데이트: 2026-03-12
> 관련 컨트롤러: `src/module/admin-auth/presentation/controllers/admin-auth.controller.ts`

## 개요

관리자가 아이디/비밀번호로 로그인하여 JWT Access Token + Refresh Token을 발급받고, 토큰 갱신 및 로그아웃하는 인증 흐름을 검증합니다.

## 사전 조건 (Preconditions)

| 항목        | 설명                                                                    |
| ----------- | ----------------------------------------------------------------------- |
| 인증 토큰   | 로그인/토큰갱신은 공개 API, 로그아웃은 인증 불필요(refreshToken만 전달) |
| 선행 데이터 | SUPER_ADMIN, ADMIN 역할의 관리자 계정이 DB에 존재                       |
| 외부 서비스 | Mock 불필요                                                             |

## 제거된 시나리오 및 근거

| 제거 항목                                        | 근거                                                   |
| ------------------------------------------------ | ------------------------------------------------------ |
| 로그인 입력 검증 (아이디 길이, 비밀번호 형식 등) | DTO/Pipe 유닛 테스트 영역                              |
| 리프레시 토큰 형식 오류 (콜론 없음 등)           | 도메인 서비스 유닛 테스트 영역                         |
| 관리자 상세 조회 - 존재하지 않는 ID              | 목록 조회 happy path에서 유효 ID 확보, 404는 단순 분기 |

---

## 테스트 시나리오 - 인증 (AAUTH)

---

### Happy Path

---

### TC-AAUTH-001: 유효한 자격증명으로 관리자 로그인 성공

> **분류**: Happy Path
> **대상 API**: `POST /v1/admin-auth/login`
> **테스트 상태**: [x] 작성완료

**Given**

- SUPER_ADMIN 역할의 활성화된 관리자 계정이 존재함 (loginId: `admin`, password: `P@ssw0rd!`)

**When**

- `POST /v1/admin-auth/login` 요청
- Body: `{ "loginId": "admin", "password": "P@ssw0rd!" }`

**Then**

- 응답 상태: `200 OK`
- 응답 본문에 `accessToken` (JWT 형식) 포함
- 응답 본문에 `refreshToken` (`{tokenId}:{rawToken}` 형식) 포함
- 부수 효과: DB에 관리자의 `lastLoginAt`이 갱신됨

---

### TC-AAUTH-002: 리프레시 토큰으로 새 토큰 발급 성공

> **분류**: Happy Path
> **대상 API**: `POST /v1/admin-auth/refresh`
> **테스트 상태**: [x] 작성완료

**Given**

- TC-AAUTH-001에서 발급받은 `refreshToken`이 존재함

**When**

- `POST /v1/admin-auth/refresh` 요청
- Body: `{ "refreshToken": "{TC-AAUTH-001에서 발급받은 refreshToken}" }`

**Then**

- 응답 상태: `200 OK`
- 응답 본문에 새로운 `accessToken`, `refreshToken` 포함
- 기존 리프레시 토큰은 무효화됨 (Token Rotation)

---

### TC-AAUTH-003: 로그아웃 성공

> **분류**: Happy Path
> **대상 API**: `POST /v1/admin-auth/logout`
> **테스트 상태**: [x] 작성완료

**Given**

- 유효한 `refreshToken`이 존재함

**When**

- `POST /v1/admin-auth/logout` 요청
- Body: `{ "refreshToken": "{유효한 refreshToken}" }`

**Then**

- 응답 상태: `204 No Content`
- 부수 효과: DB에서 해당 리프레시 토큰 삭제됨
- 부수 효과: 이후 해당 리프레시 토큰으로 갱신 시도 시 실패

---

### 인증/인가 검증

---

### TC-AAUTH-004: 잘못된 비밀번호로 로그인 실패

> **분류**: 인증/인가 검증
> **대상 API**: `POST /v1/admin-auth/login`
> **테스트 상태**: [x] 작성완료

**Given**

- 관리자 계정이 존재함 (loginId: `admin`)

**When**

- `POST /v1/admin-auth/login` 요청
- Body: `{ "loginId": "admin", "password": "WrongP@ss1" }`

**Then**

- 응답 상태: `401 Unauthorized`
- 에러 코드: `INVALID_CREDENTIALS`

---

### TC-AAUTH-005: 존재하지 않는 아이디로 로그인 실패

> **분류**: 인증/인가 검증
> **대상 API**: `POST /v1/admin-auth/login`
> **테스트 상태**: [x] 작성완료

**Given**

- `nonexist` 아이디의 관리자 계정이 존재하지 않음

**When**

- `POST /v1/admin-auth/login` 요청
- Body: `{ "loginId": "nonexist", "password": "P@ssw0rd!" }`

**Then**

- 응답 상태: `401 Unauthorized`
- 에러 코드: `INVALID_CREDENTIALS`
- (아이디 미존재와 비밀번호 불일치를 구분하지 않음 — 계정 존재 여부 노출 방지)

---

### 핵심 비즈니스 규칙

---

### TC-AAUTH-006: 비활성화된 관리자 계정으로 로그인 시도

> **분류**: 핵심 비즈니스 규칙
> **대상 API**: `POST /v1/admin-auth/login`
> **테스트 상태**: [x] 작성완료

**Given**

- 관리자 계정이 존재하지만 비활성 상태임 (loginId: `inactive-admin`, isActive: `false`)

**When**

- `POST /v1/admin-auth/login` 요청
- Body: `{ "loginId": "inactive-admin", "password": "P@ssw0rd!" }`

**Then**

- 응답 상태: `403 Forbidden`
- 에러 코드: `ADMIN_ACCOUNT_INACTIVE`

---

### TC-AAUTH-007: 이미 사용된 리프레시 토큰으로 갱신 시도 (Token Rotation)

> **분류**: 핵심 비즈니스 규칙
> **대상 API**: `POST /v1/admin-auth/refresh`
> **테스트 상태**: [x] 작성완료

**Given**

- 로그인으로 발급받은 리프레시 토큰을 1회 사용하여 갱신 완료함 (토큰 소멸됨)

**When**

- `POST /v1/admin-auth/refresh` 요청
- Body: `{ "refreshToken": "{이미 사용된 refreshToken}" }`

**Then**

- 응답 상태: `401 Unauthorized`
- 에러 코드: `REFRESH_TOKEN_NOT_FOUND`

---
