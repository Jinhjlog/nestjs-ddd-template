# 파일 업로드 (File Upload)

## 1. 배경 및 문제 정의

여러 기능에서 파일 첨부가 필요하다. 각 모듈이 파일 업로드를 독립적으로 구현하면 코드 중복과 유지보수 비용이 증가한다. 또한 파일 스토리지 인프라가 확정되지 않은 상태이므로, 스토리지에 의존하지 않는 공통 파일 업로드 시스템이 필요하다.

Presigned URL 방식을 채택하여 서버가 파일 바이너리를 직접 수신하지 않고 클라이언트가 스토리지에 직접 업로드하도록 한다. 업로드 후 확인되지 않는 고아 파일(Orphaned Files)은 체계적으로 관리한다.

## 2. 목표

- Presigned URL 기반의 클라이언트 직접 업로드를 지원한다.
- 스토리지 제공자에 의존하지 않는 추상화 계층(`FileStoragePort`)을 제공한다.
- 파일 업로드 생명주기(발급 → 업로드 → 확인)를 `uploaded_files` 테이블로 추적한다.
- 고아 파일을 자동으로 정리하여 스토리지 비용을 최소화한다.
- 파일 크기, MIME 타입 등 업로드 제약조건을 서버 측에서 용도별로 강제한다.
- 여러 모듈에서 공통으로 사용 가능한 OHS 인터페이스를 제공한다.

## 3. 사용자 시나리오

### 시나리오 1. Presigned URL 발급 및 업로드

1. 관리자가 파일 첨부가 필요한 화면에서 파일을 선택한다.
2. 클라이언트가 서버에 업로드 URL 발급을 요청한다 (파일명, MIME 타입, 파일 크기, 용도 전달).
3. 서버는 용도별 업로드 정책(허용 MIME 타입, 최대 파일 크기)을 검증한다.
4. 검증 통과 시 파일 메타데이터를 `PENDING` 상태로 DB에 저장하고, Presigned URL과 파일 ID를 반환한다.
5. 클라이언트가 Presigned URL로 스토리지에 직접 업로드한다.
6. 업로드 완료 후 클라이언트가 서버에 업로드 확인 API를 호출한다.
7. 서버는 스토리지에 파일 존재를 검증하고 상태를 `CONFIRMED`로 전환한다.

### 시나리오 2. 파일을 엔티티에 연결

1. 관리자가 게시글 저장 시 첨부 파일 ID를 함께 전달한다.
2. 서버는 파일 상태가 `CONFIRMED`인지 확인하고 `linked_at`을 기록한다.
3. 이 과정은 각 피처 모듈이 OHS(`UploadedFileAttachmentService`)를 통해 처리한다.

### 시나리오 3. 고아 파일 자동 정리

1. 크론잡이 매일 오전 2시에 실행된다.
2. `PENDING` 상태이면서 `expires_at`이 지난 파일: DB + 스토리지 삭제.
3. `CONFIRMED` 상태이면서 24시간 이상 연결되지 않은 파일: DB + 스토리지 삭제.

## 4. 기능 요구사항

### 업로드 URL 발급

- [x] 파일명, MIME 타입, 파일 크기, 용도를 입력받아 Presigned URL 발급
- [x] 용도별 허용 MIME 타입 검증 → 400(`MIME_TYPE_NOT_ALLOWED`)
- [x] 용도별 최대 파일 크기 검증 → 400(`FILE_SIZE_EXCEEDED`)
- [x] 지원하지 않는 용도 → 400(`UNSUPPORTED_PURPOSE`)
- [x] `PENDING` 상태로 DB 저장, 15분 만료 시간 설정

### 업로드 확인

- [x] 파일 ID로 업로드 확인 요청
- [x] 스토리지에 파일 존재 검증 → 400(`FILE_NOT_UPLOADED`)
- [x] 존재하지 않는 파일 ID → 404(`FILE_NOT_FOUND`)
- [x] 이미 확인된 파일 → 400(`FILE_ALREADY_CONFIRMED`)
- [x] 만료된 파일 → 400(`FILE_UPLOAD_EXPIRED`)
- [x] 확인 성공 시 `CONFIRMED` + `confirmed_at` 기록
- [x] `editor-content` 용도는 confirm 시 자동 link 처리

### 고아 파일 정리

- [x] 만료된 `PENDING` 파일 삭제 (DB + 스토리지)
- [x] 미연결 `CONFIRMED` 파일 삭제 (24시간 경과, DB + 스토리지)
- [x] 매일 오전 2시 크론잡 실행

### 아키텍처

- [x] `FileStoragePort` 추상화 (Port/Adapter 패턴)
- [x] `MockFileStorageAdapter` 개발 환경용 어댑터 (로컬 파일시스템)
- [x] `UploadedFileAttachmentService` OHS (다른 BC에서 파일 첨부 시 사용)

## 5. 범위

### 포함

- Presigned URL 발급 / 업로드 확인 API
- 스토리지 추상화 (`FileStoragePort` + Mock 어댑터)
- 파일 생명주기 관리 (`uploaded_files` 테이블)
- 고아 파일 자동 정리 스케줄러
- OHS (`UploadedFileAttachmentService`) — 다른 모듈에서 파일 첨부 연결

### 미포함

- 프로덕션 스토리지 어댑터 (Firebase, S3 등) — 필요 시 구현
- 파일 다운로드 API
- 이미지 리사이즈 / 썸네일 생성
- 사용자 직접 업로드 (현재 관리자만 가능)
