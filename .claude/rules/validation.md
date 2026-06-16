# Rules: 검증 책임 (범용)

> 핵심 정책: **검증은 도메인 VO 책임. Request DTO는 타입 가드만.**
> (구체적 VO 이름·검증 유틸은 프로젝트마다 다르므로 **기존 코드 조사**로 그 프로젝트 것을 쓴다. 아래 이름은 _예시_.)

## Request DTO (presentation)

- **타입 가드만**: `@IsString()`, `@IsOptional()`, (선택) `@IsNotEmpty()` 정도.
- **비즈니스 규칙 검증 금지**: 길이/형식/enum을 `@MaxLength`/`@MinLength`/`@IsEmail`/`@IsEnum`으로 막지 않는다 → VO 책임.
- 허용값·길이는 `@ApiProperty`에 **문서로만** 표기(`maxLength`, `enum: [...]`). enum은 **지역 리터럴 배열**로 인라인(모듈 루트 상수 파일 금지 — `conventions.md` §4).

## 도메인 VO (검증의 실제 위치)

- 길이/필수/공백, 이메일·형식, enum 멤버십 등 비즈니스 규칙은 **VO의 `create()`에서 검증**(위반 시 도메인 예외 throw).
- `unsafeCreate()`는 Mapper 복원용(검증 없음).
- ※ 사용할 VO/유틸(예: 길이제한 문자열 VO, 이메일 VO, 상태 enum VO)·예외 클래스는 **그 프로젝트의 도메인 라이브러리를 조사**해 쓴다.

## Aggregate create 시그니처

- **원시값을 받아 내부에서 VO 생성**(UseCase는 원시값만 전달, VO를 몰라도 됨).
- **예외**: VO 생성이 async거나 외부 의존(중복검사·해시 등)이 필요하면 → UseCase/도메인 서비스가 VO를 준비해 주입.

## UseCase

- enum/길이 검증은 도메인 VO `create()`로 위임. UseCase가 직접 검증 로직 작성 금지.
- 조회 실패 → 그 프로젝트의 NotFound 예외(예: `EntityNotFoundException`)로 처리 (errorCode 네이밍은 조사).

## 검증 에러 응답 형태 (→ `api-response.md`)

- **요청 바디(DTO) 검증 실패** → `ValidationPipe.exceptionFactory`(`validationExceptionFactory`)가 RFC 9457 `code: VALIDATION_FAILED` + `errors[{ name, code, detail }]` 다건으로 변환. `errors[]`엔 **타입가드 코드만**(`REQUIRED`/`INVALID_TYPE`/`OUT_OF_RANGE`…).
- **VO 검증 실패**(`ValueObjectValidationException({ code, detail })`) → 구체 `code`(예: `INVALID_EMAIL_FORMAT`) + `detail`. **fail-fast 단건이라 `errors[]` 없음.**
- ⚠️ **VO 검증은 집계하지 않는다(Notification·수집기·neverthrow 도입 금지).** VO는 throw-단건이 표준 — 첫 위반에서 throw. 여러 필드를 한 번에 모으려 try/catch 수집기를 만들지 말 것(논의 후 기각됨: throw 패턴과 어긋나고, DTO 다건은 이미 class-validator가 배치로 처리). 다건이 필요한 건 DTO 레벨뿐.
- 예외는 `HttpStatus`를 모르고 `ErrorCategory`만 보유 — HTTP 매핑은 예외 필터에서만. 상세는 `api-response.md`.
