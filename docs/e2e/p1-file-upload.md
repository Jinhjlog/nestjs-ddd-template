# 파일 업로드 E2E 테스트 시나리오

> 우선순위: P1 | 최종 업데이트: 2026-03-13
> 관련 컨트롤러: `src/module/file-upload/presentation/controllers/file-upload.controller.ts`

## 개요

Presigned URL 기반 파일 업로드의 전체 생명주기(URL 발급 → 스토리지 직접 업로드 → 확인)를 검증합니다. 용도별 업로드 정책(MIME 타입, 파일 크기)이 올바르게 적용되고, 파일 상태 전이(`PENDING` → `CONFIRMED`)가 정상 동작하는지 확인합니다.

## 사전 조건 (Preconditions)

| 항목        | 설명                                                                                |
| ----------- | ----------------------------------------------------------------------------------- |
| 인증 토큰   | `SUPER_ADMIN` 또는 `ADMIN` 역할의 관리자 토큰 필요 (모든 API에 `@AdminAuth()`)      |
| 선행 데이터 | 관리자 계정이 DB에 존재                                                             |
| 외부 서비스 | `FileStoragePort` — 개발 환경에서는 `MockFileStorageAdapter` (로컬 파일시스템) 사용 |

## 제거된 시나리오 및 근거

| 제거 항목                                             | 근거                                                   |
| ----------------------------------------------------- | ------------------------------------------------------ |
| 파일명 누락 (`fileName` 빈 값)                        | BoundedString VO 유닛 테스트 영역                      |
| 파일명 255자 초과                                     | BoundedString VO 유닛 테스트 영역                      |
| `mimeType`, `fileSize`, `purpose` 필드 누락/타입 오류 | DTO Validation Pipe 유닛 테스트 영역                   |
| `fileSize` 음수/0 입력                                | `@IsPositive()` DTO 유닛 테스트 영역                   |
| Body 미전송, 잘못된 UUID 형식                         | DTO/Pipe 유닛 테스트 영역                              |
| confirm API 인증 검증 (401)                           | 같은 컨트롤러 내 동일 `@AdminAuth()` — 대표 1개로 충분 |

---

## 테스트 시나리오 - 파일 업로드 (FUPL)

---

### Happy Path

---

### TC-FUPL-001: Presigned URL 발급 성공

> **분류**: Happy Path
> **대상 API**: `POST /v1/admin/files/upload-url`
> **테스트 상태**: [x] 작성완료

**Given**

- 관리자 인증 토큰이 유효함

**When**

- `POST /v1/admin/files/upload-url` 요청
- Body: `{ "fileName": "report.pdf", "mimeType": "application/pdf", "fileSize": 1048576, "purpose": "attachment" }`

**Then**

- 응답 상태: `201 Created`
- 응답 본문에 `fileId` 포함 (문자열, ULID 형식)
- 응답 본문에 `uploadUrl` 포함 (문자열, URL 형식)
- 응답 본문에 `method` 포함 (`"PUT"` 또는 `"POST"`)
- 응답 본문에 `headers` 포함 (객체, `Content-Type` 키 존재)

---

### TC-FUPL-002: 전체 업로드 플로우 성공 (발급 → 업로드 → 확인)

> **분류**: Happy Path
> **대상 API**: `POST /v1/admin/files/upload-url` → `PUT {uploadUrl}` → `POST /v1/admin/files/:fileId/confirm`
> **테스트 상태**: [x] 작성완료

**Given**

- 관리자 인증 토큰이 유효함

**When**

1. `POST /v1/admin/files/upload-url` 요청
   - Body: `{ "fileName": "banner.jpg", "mimeType": "image/jpeg", "fileSize": 512000, "purpose": "profile-image" }`
2. 반환된 `uploadUrl`로 파일 바이너리를 `method`/`headers`에 맞게 업로드
3. `POST /v1/admin/files/{fileId}/confirm` 요청

**Then**

- 1단계 응답 상태: `201 Created` — `fileId`, `uploadUrl` 반환
- 2단계 응답 상태: `200 OK` (Mock 스토리지 업로드 성공)
- 3단계 응답 상태: `200 OK`
- 3단계 응답 본문에 `fileId` 포함 (1단계에서 받은 값과 동일)
- 3단계 응답 본문에 `fileUrl` 포함 (문자열, URL 형식)
- 반환된 `fileUrl`로 GET 요청 시 파일이 정상 서빙됨 (`200 OK`)

---

### TC-FUPL-003: editor-content 업로드 시 confirm 후 자동 link 처리

> **분류**: Happy Path
> **대상 API**: `POST /v1/admin/files/upload-url` → `PUT {uploadUrl}` → `POST /v1/admin/files/:fileId/confirm`
> **테스트 상태**: [x] 작성완료

**Given**

- 관리자 인증 토큰이 유효함

**When**

1. `POST /v1/admin/files/upload-url` 요청
   - Body: `{ "fileName": "editor-image.jpg", "mimeType": "image/jpeg", "fileSize": 204800, "purpose": "editor-content" }`
2. 반환된 `uploadUrl`로 파일 바이너리를 `method`/`headers`에 맞게 업로드
3. `POST /v1/admin/files/{fileId}/confirm` 요청

**Then**

- 3단계 응답 상태: `200 OK`
- 3단계 응답 본문에 `fileId`, `fileUrl` 포함
- DB에서 해당 파일의 `linkedAt`이 `null`이 아님 (자동 link 처리 확인)

---

### 인증/인가 검증

---

### TC-FUPL-004: 인증 없이 Presigned URL 발급 요청 시 401

> **분류**: 인증/인가 검증
> **대상 API**: `POST /v1/admin/files/upload-url`
> **테스트 상태**: [x] 작성완료

**Given**

- 인증 토큰이 없음

**When**

- `POST /v1/admin/files/upload-url` 요청 (Authorization 헤더 없음)
- Body: `{ "fileName": "report.pdf", "mimeType": "application/pdf", "fileSize": 1048576, "purpose": "attachment" }`

**Then**

- 응답 상태: `401 Unauthorized`

---

### 핵심 비즈니스 규칙

---

### TC-FUPL-005: 지원하지 않는 용도로 업로드 요청

> **분류**: 핵심 비즈니스 규칙
> **대상 API**: `POST /v1/admin/files/upload-url`
> **테스트 상태**: [x] 작성완료

**Given**

- 관리자 인증 토큰이 유효함

**When**

- `POST /v1/admin/files/upload-url` 요청
- Body: `{ "fileName": "file.pdf", "mimeType": "application/pdf", "fileSize": 1048576, "purpose": "invalid-purpose" }`

**Then**

- 응답 상태: `400 Bad Request`
- 에러 코드: `UNSUPPORTED_PURPOSE`

---

### TC-FUPL-006: 허용되지 않은 MIME 타입으로 업로드 요청

> **분류**: 핵심 비즈니스 규칙
> **대상 API**: `POST /v1/admin/files/upload-url`
> **테스트 상태**: [x] 작성완료

**Given**

- 관리자 인증 토큰이 유효함

**When**

- `POST /v1/admin/files/upload-url` 요청
- Body: `{ "fileName": "banner.exe", "mimeType": "application/x-msdownload", "fileSize": 1048576, "purpose": "profile-image" }`
- (profile-image 용도는 이미지만 허용: image/jpeg, image/png, image/webp)

**Then**

- 응답 상태: `400 Bad Request`
- 에러 코드: `MIME_TYPE_NOT_ALLOWED`

---

### TC-FUPL-007: 파일 크기 초과로 업로드 요청

> **분류**: 핵심 비즈니스 규칙
> **대상 API**: `POST /v1/admin/files/upload-url`
> **테스트 상태**: [x] 작성완료

**Given**

- 관리자 인증 토큰이 유효함

**When**

- `POST /v1/admin/files/upload-url` 요청
- Body: `{ "fileName": "large-image.jpg", "mimeType": "image/jpeg", "fileSize": 11534336, "purpose": "profile-image" }`
- (profile-image 용도 최대 크기: 5MB = 5,242,880 bytes, 요청 크기: ~11MB)

**Then**

- 응답 상태: `400 Bad Request`
- 에러 코드: `FILE_SIZE_EXCEEDED`

---

### TC-FUPL-008: 존재하지 않는 파일 ID로 업로드 확인 요청

> **분류**: 핵심 비즈니스 규칙
> **대상 API**: `POST /v1/admin/files/:fileId/confirm`
> **테스트 상태**: [x] 작성완료

**Given**

- 관리자 인증 토큰이 유효함
- `01NONEXISTENT000000000000` ID의 파일 레코드가 DB에 존재하지 않음

**When**

- `POST /v1/admin/files/01NONEXISTENT000000000000/confirm` 요청

**Then**

- 응답 상태: `404 Not Found`
- 에러 코드: `FILE_NOT_FOUND`

---

### TC-FUPL-009: 스토리지에 파일 없이 업로드 확인 요청

> **분류**: 핵심 비즈니스 규칙
> **대상 API**: `POST /v1/admin/files/:fileId/confirm`
> **테스트 상태**: [x] 작성완료

**Given**

- 관리자 인증 토큰이 유효함
- Presigned URL이 발급되어 `PENDING` 상태 파일 레코드가 존재함 (fileId 확보)
- 클라이언트가 실제 파일을 스토리지에 업로드하지 않음

**When**

- `POST /v1/admin/files/{fileId}/confirm` 요청

**Then**

- 응답 상태: `400 Bad Request`
- 에러 코드: `FILE_NOT_UPLOADED`

---

### TC-FUPL-010: 이미 확인된 파일을 재확인 요청

> **분류**: 핵심 비즈니스 규칙
> **대상 API**: `POST /v1/admin/files/:fileId/confirm`
> **테스트 상태**: [x] 작성완료

**Given**

- 관리자 인증 토큰이 유효함
- 전체 업로드 플로우가 완료되어 `CONFIRMED` 상태인 파일이 존재함 (fileId 확보)

**When**

- `POST /v1/admin/files/{fileId}/confirm` 재요청

**Then**

- 응답 상태: `400 Bad Request`
- 에러 코드: `FILE_ALREADY_CONFIRMED`

---

### TC-FUPL-011: 만료된 파일에 대해 업로드 확인 요청

> **분류**: 핵심 비즈니스 규칙
> **대상 API**: `POST /v1/admin/files/:fileId/confirm`
> **테스트 상태**: [x] 작성완료

**Given**

- 관리자 인증 토큰이 유효함
- Presigned URL 발급 후 15분이 경과하여 `expiresAt`을 초과한 `PENDING` 상태 파일이 존재함 (fileId 확보)
- 스토리지에 파일이 업로드되어 있음

**When**

- `POST /v1/admin/files/{fileId}/confirm` 요청

**Then**

- 응답 상태: `400 Bad Request`
- 에러 코드: `FILE_UPLOAD_EXPIRED`
