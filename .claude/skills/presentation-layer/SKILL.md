---
name: presentation-layer
description: 'DDD 프레젠테이션 레이어 구현. Controllers, Request/Response DTOs, Transformers를 생성. "프레젠테이션 레이어 구현" 또는 "presentation layer" 키워드 사용 시 실행.'
allowed-tools: Read, Write, Glob, Grep, Bash
user-invocable: true
---

# Presentation Layer 구현 스킬

> **이 스킬은 범용 패턴(책)이다. 특정 값을 고정하지 않는다.**
> ID 타입(UUID/ULID)·인증 데코레이터·응답 래퍼·페이지네이션 방식·`@ApiTags` 네이밍 등 **프로젝트마다 다른 값은 기존 코드 조사로 수집**해 따른다.
> 항상 `.claude/rules/`(특히 `conventions.md`·`validation.md`)를 준수한다.

## 실행 트리거

- "프레젠테이션 레이어 구현", "presentation layer"
- "Controller 만들어줘", "API 엔드포인트 추가", "Request/Response DTO 작성", "Transformer 추가"

---

## 0. 시작 전: 컨벤션 조사 (필수, 추론 금지)

코드 작성 전 **기존 모듈을 조사**해 아래를 수집한다 (rules/conventions.md §1):

1. 응답 래퍼 유무 2. 페이지네이션 방식(커서/오프셋)+공용 DTO/유틸 3. ID 타입+파라미터 파이프
2. 인증/인가 데코레이터·가드·역할 체계·공개 엔드포인트 선언법 5. `@ApiProperty` 스타일(선택 표기/enum/제약)
3. `@ApiTags` 네이밍 7. 에러 응답 형태/errorCode 8. 파일 구조·역할별 컨트롤러 분리 여부 9. 요청 메타(IP 등) 취득 방식

조사로 확정 못 하면 추론하지 말고 합리적 기본값 + `dev/context-notes.md` 기록.

---

## 파일 구조 (예시 — 기존 모듈 구조에 맞춤)

```
src/module/{module-name}/presentation/
├── controllers/        # 역할별 분리 (예: public-*, super-admin-* ...) + index.ts
├── dtos/
│   ├── request/        # create/update/find-list 등 + index.ts
│   ├── response/       # list/detail (+ base) 등 + index.ts
│   └── index.ts
└── transformers/       # ReadModel → Response DTO 변환 + index.ts
```

---

## 핵심 규칙

### 1. 컨트롤러 분리 / 인증

- **역할별로 컨트롤러를 분리**한다(인증 없는 공개 / 역할별 관리자 등). 분리 단위·네이밍은 기존 모듈 조사.
- **인증/인가는 그 프로젝트의 데코레이터·가드를 조사**해 적용. 추측 금지.
- 인증 데코레이터가 **401/403 Swagger 응답을 자동 부착**하면(예: 역할 가드 데코레이터) 컨트롤러에서 **중복 작성하지 않는다** → 조사로 확인.

### 2. ID / 파라미터

- **ID 타입은 조사해서 따른다** (UUID면 검증 파이프 사용, ULID면 문자열로 등). "ULID다/UUID다"를 가정하지 않는다.

### 3. 검증 = VO 책임 (rules/validation.md)

- Request DTO는 **타입 가드만**(`@IsString`/`@IsOptional` 등). 길이/형식/enum을 `@MaxLength`/`@IsEmail`/`@IsEnum`으로 막지 않는다 → **도메인 VO**가 검증.
- 허용값·길이는 `@ApiProperty`에 **문서로만**(`maxLength`, `enum: [...]` 리터럴). enum은 모듈 루트 상수 파일로 빼지 말고 인라인.

### 4. 응답 스키마 격리 (rules/conventions.md §3)

- 클라이언트 코드 생성기(orval 등) 파급을 막기 위해, 필요 시 **응답 스키마를 엔드포인트(역할×동작)별로 격리**(같은 모양이어도 이름 분리). 중첩 DTO도 전역 충돌 피하게.
- **잘 안 변하는 공통 코어는 Base 타입으로 묶고 역할별 상속**(빈 상속도 가능). 변동분만 역할 파일에.
- ※ 이 격리가 그 프로젝트에 필요한지(codegen 사용 등)는 조사로 판단.

### 5. Transformer 사용

- 컨트롤러 인라인 매핑 금지 → **Transformer(static)**. `toListResponse()`/`toDetailResponse()` 등. (기존 구조에 맞춤)

### 6. nullable 변환

- Transformer(domain→presentation): `undefined → null` **삼항 연산자**(`??` 금지).
- QueryService Impl(DB→domain): `null → undefined` 삼항.

### 7. Swagger 문서화 (응답·에러 표준 = `rules/api-response.md`)

- **성공 = 리소스 그대로**(래퍼 없음): `@ApiOkResponse`/`@ApiCreatedResponse({ type: ResponseDto })`, 204는 `@ApiNoContentResponse`.
- **에러 = RFC 9457 problem+json**: 본문 스키마는 항상 `ProblemDetailsDto` → **`@ApiProblemResponse(status, description)`**(`@shared/swagger`) 사용. description에 발생 가능 `code` 나열. (상태별 `@ApiNotFoundResponse` 등 대신 통일)
- `@ApiOperation`·`@ApiParam`·명시적 `@HttpCode()` 부착.
- 에러 문서화 범위는 단계에 맞게(Mock·계약 단계면 happy 위주, 인증 401/403은 데코레이터 자동분 활용). 선제적 전체 에러 문서화는 단계 규율 따라 보류 가능.

### 8. 페이지네이션

- **방식(커서/오프셋)과 응답 구조는 조사**해 그 프로젝트 공용 DTO/유틸을 재사용. 특정 구조를 가정하지 않는다.

### 9. index.ts 배럴

- 모든 하위 디렉터리에 `index.ts` re-export.

---

## 구현 순서

1. **0. 컨벤션 조사** → 2. Response DTO → 3. Request DTO → 4. Transformer → 5. Controller → 6. Swagger(`swagger-bot` 스킬)

## 상세 패턴 문서

- `patterns/controller.md` / `patterns/request-dto.md` / `patterns/response-dto.md` / `patterns/transformer.md`

---

## 금지 사항

- Controller에 비즈니스 로직 / 인라인 매핑(Transformer 필수)
- DTO에서 비즈니스 규칙 검증(`@MaxLength`/`@IsEmail`/`@IsEnum`) — VO 책임
- `?? undefined` / `?? null` (삼항 사용)
- `@ApiProperty()` 누락 / Swagger 문서화 누락
- **특정 값 가정**(ID=ULID, 특정 인증 데코레이터 등) — 반드시 조사
