---
name: swagger-bot
description: 'NestJS 컨트롤러의 Swagger API 데코레이터를 생성합니다. 유즈케이스를 분석하여 정확한 API 문서화 데코레이터를 작성합니다. "스웨거", "swagger", "API 문서" 키워드 사용 시 실행.'
allowed-tools: Read, Grep, Glob, Edit, Bash
user-invocable: true
---

# Swagger API Decorator 스킬

NestJS Swagger 데코레이터 작성을 위한 **지식 책**이다. presentation 단계에서 컨트롤러를 작성한 **실행자가 이 책을 읽고 인라인으로 적용**한다(별도 에이전트 아님 — 방금 작성한 컨트롤러에 종속되므로, `rules/agents.md` 판별선).

> ⚠️ **특정 값을 고정하지 않는다.** VO 종류·에러코드 규칙·도메인 예외 클래스·ID 타입·에러 문서 포맷은 **프로젝트마다 다르다** → **기존 코드/VO 구현 조사**로 그 프로젝트 것을 쓴다. 아래는 _예시_(이 작업이 행해진 레포 기준).

**모든 응답과 문서는 한국어로 작성합니다.**

## 목표

컨트롤러 API 엔드포인트의 유즈케이스를 분석하고, 정확하고 상세한 Swagger 데코레이터를 작성합니다.

## 작업 흐름

### 1단계: 유즈케이스 파일 읽기

- 대상 API의 유즈케이스 파일을 찾아 읽기
- 파일 위치 패턴: `src/module/{모듈}/application/usecases/{유즈케이스}.usecase.ts`

### 2단계: 검증 로직 추출

- UseCase/도메인이 사용하는 **VO `create()` 호출을 조사**해 그 필드의 검증 규칙을 파악 (어떤 VO가 있는지·무슨 에러를 던지는지는 프로젝트별 → 조사)
  - (예시: `BoundedString.create()` / `PositiveNumber.create()` / `Url.create()` — 이 레포 VO)
- 모든 예외 throw 구문 확인 + 도메인 모델 비즈니스 규칙 확인

### 3단계: 에러 코드 정리

필드별 가능한 에러 코드를 목록화하고 제약 조건을 문서화합니다.

### 4단계: 데코레이터 작성

`@ApiOperation`, 성공 응답 데코레이터, `@ApiProblemResponse(각 에러 상태)`, `@ApiParam` 순으로 작성합니다. (에러는 상태별 `@ApiNotFoundResponse`/`@ApiBadRequestResponse` 직접 사용 X — `@ApiProblemResponse`로 통일)

### 5단계: 검증

모든 검증 로직이 문서에 빠짐없이 반영되었는지 확인합니다.

## 에러 코드 생성 규칙 (예시 — 프로젝트 VO 규칙 조사)

> VO가 에러코드를 만드는 규칙은 프로젝트마다 다르다. **해당 VO 구현을 조사**해 실제 코드/포맷을 쓴다. 아래는 _이 레포 예시_.

이 레포의 Value Object는 `toErrorCode()`로 에러 코드를 생성한다:

- camelCase → SNAKE*CASE (예: `displayTitle` → `DISPLAY_TITLE`), 공백→`*`, 대문자

### BoundedString 에러 코드 (예시)

```
{FIELD}_REQUIRED    - 필수 값이 비어있음
{FIELD}_TOO_SHORT   - 최소 길이 미달
{FIELD}_TOO_LONG    - 최대 길이 초과
```

### PositiveNumber 에러 코드

```
{FIELD}_REQUIRED              - 필수 값 없음
{FIELD}_INVALID               - 유효하지 않은 숫자
{FIELD}_NEGATIVE              - 음수
{FIELD}_ZERO_NOT_ALLOWED      - 0 허용 안 됨
{FIELD}_TOO_LARGE             - 최대값 초과
{FIELD}_DECIMAL_NOT_ALLOWED   - 소수점 허용 안 됨
```

### 도메인 예외 → HTTP 매핑 (카테고리 기반 — `rules/api-response.md`)

> 예외는 `HttpStatus`를 모르고 **`ErrorCategory`만 보유** — 매핑은 예외 필터에서만. 에러 본문은 **RFC 9457 problem+json**(`ProblemDetailsDto`).

| 예외 클래스                                              | 카테고리        | HTTP    |
| -------------------------------------------------------- | --------------- | ------- |
| `EntityNotFoundException`                                | NOT_FOUND       | 404     |
| `DuplicateEntityException` · `ConcurrentUpdateException` | CONFLICT        | 409     |
| `DomainRuleViolationException`                           | RULE_VIOLATION  | **422** |
| `ValueObjectValidationException`(VO 단건) · `RequestValidationException`(DTO 다건 `errors[]`) | VALIDATION | 400 |
| `AuthenticationException`                                | UNAUTHENTICATED | 401     |
| `AuthorizationException`                                 | FORBIDDEN       | 403     |
| `InternalException`(서버측 실패 — 토큰 서명·인프라 오류) | INTERNAL        | 500     |
| (외부 의존 불가)                                         | UNAVAILABLE     | 503     |

## 데코레이터 작성 규칙

### @ApiOperation

```typescript
@ApiOperation({
  summary: '기능명 [역할]', // 역할 없으면 '기능명' — 날짜 미표기(기존 컨트롤러 관례, 조사 우선)
  description:
    '기능 설명<br><br>' +
    '**필수 항목**<br>' +
    '필수 필드 나열<br><br>' +
    '**선택 항목**<br>' +
    '선택 필드 나열<br><br>' +
    '**주의사항**<br>' +
    '- 비즈니스 규칙<br>' +
    '- 특이사항<br>',
})
```

- 필수/선택 항목을 명확히 구분
- 비즈니스 규칙을 간결하게 설명

### 에러 응답 description 작성 (데코레이터 = `@ApiProblemResponse`)

```typescript
@ApiProblemResponse(
  HttpStatus.BAD_REQUEST,
  '잘못된 요청 (필드 검증 실패 등)<br>' +
    '**필드명**<br>' +
    '- 에러 상황 설명 (제약 조건): _**ERROR_CODE**_<br>' +
    '<br>' +
    '**다른 필드명**<br>' +
    '- 에러 상황 설명: _**ERROR_CODE**_<br>',
)
```

- 유즈케이스의 모든 검증 로직을 빠짐없이 반영
- 필드별로 그룹화
- 제약 조건 명시 (예: 최대 100자, 양수만 가능)
- 에러 코드 표기 포맷은 **기존 컨트롤러 조사**해 일치 (이 레포 예시: 이탤릭 볼드 `_**ERROR_CODE**_`)

### HTTP 상태별 응답 데코레이터

**성공**은 각 ResponseDto, **에러**는 RFC 9457 problem+json — 본문 스키마는 항상 `ProblemDetailsDto`. 에러는 `@ApiProblemResponse(status, description)`(`@shared/swagger`)를 쓴다(=`type: ProblemDetailsDto` 자동). `description`엔 발생 가능한 `code`를 나열.

```typescript
// 성공
@ApiCreatedResponse({ description: '리소스 생성 성공', type: ResponseDto }) // POST
@ApiOkResponse({ description: '요청 성공', type: ResponseDto })            // GET/PATCH
@ApiNoContentResponse({ description: '리소스 삭제 성공' })                  // DELETE 204

// 에러 (problem+json) — ApiProblemResponse 사용
@ApiProblemResponse(HttpStatus.BAD_REQUEST, '검증 실패: _**VALIDATION_FAILED**_')
@ApiProblemResponse(HttpStatus.NOT_FOUND, '리소스를 찾을 수 없음: _**RESOURCE_NOT_FOUND**_')
@ApiProblemResponse(HttpStatus.CONFLICT, '리소스 충돌: _**NAME_ALREADY_EXISTS**_')
@ApiProblemResponse(HttpStatus.UNPROCESSABLE_ENTITY, '비즈니스 규칙 위반: _**...**_') // 422
```

> 위 예시처럼 **description으로 에러 코드를 빠짐없이 문서화**한다. 데코레이터는 항상 **`@ApiProblemResponse`**(본문 = problem+json `ProblemDetailsDto`) — 상태별 `@ApiNotFoundResponse`/`@ApiBadRequestResponse` 직접 사용 금지.

### @ApiParam

```typescript
@ApiParam({
  name: 'id',
  description: '리소스 ID', // ID 타입(UUID/ULID 등)·example은 프로젝트 조사해서 맞춤
  example: '<프로젝트 ID 타입에 맞는 예시>',
})
```

## 완료 전 체크리스트

- [ ] 유즈케이스 파일을 읽고 분석했는가?
- [ ] 모든 검증 로직이 문서에 반영되었는가?
- [ ] 필드별 제약 조건이 명시되었는가?
- [ ] 에러 코드가 정확한가?
- [ ] 필수/선택 항목이 명확히 구분되었는가?
- [ ] 주의사항이 포함되었는가?
- [ ] HTTP 상태 코드별 적절한 응답 데코레이터가 있는가?

## 핵심 규칙

- **추측 금지**: 반드시 유즈케이스를 읽고 검증한 후 작성
- **완전성**: 모든 검증 로직을 빠짐없이 반영
- **정확성**: 에러 코드와 제약 조건을 정확하게 기술
- **일관성**: 프로젝트 전체에서 동일한 스타일 유지
- **간결성**: 불필요한 설명 제거, 핵심만 전달
