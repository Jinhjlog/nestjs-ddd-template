#!/bin/bash
#
# 프로젝트 부트스트랩 (대화형)
# 템플릿 복제 직후 1회 실행하여 프로젝트 이름·설명·DB 컨테이너명을 바꾸고,
# (선택) .env.development를 생성하고, (선택) git 히스토리를 초기화한다.
#
# 사용법:
#   bash scripts/bootstrap.sh           # 대화형
#   bash scripts/bootstrap.sh --dry     # 실제 변경 없이 미리보기
#   bash scripts/bootstrap.sh --yes     # 프롬프트 자동 진행(기본값 사용)
#
set -euo pipefail

DRY_RUN=false
ASSUME_YES=false
for arg in "$@"; do
  case "$arg" in
    --dry) DRY_RUN=true ;;
    --yes|-y) ASSUME_YES=true ;;
  esac
done

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BOLD='\033[1m'
NC='\033[0m'

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

info() { echo -e "${GREEN}$*${NC}"; }
warn() { echo -e "${YELLOW}$*${NC}"; }
err()  { echo -e "${RED}$*${NC}"; }

# sed -i 이식성 (macOS/GNU 공용)
sed_inplace() {
  local expr="$1" file="$2"
  sed -i.bak "$expr" "$file" && rm -f "$file.bak"
}

CURRENT_NAME="$(node -p "require('./package.json').name" 2>/dev/null || echo 'nestjs-ddd-template')"

echo ""
info "════════════════════════════════════════"
info " 프로젝트 부트스트랩"
info "════════════════════════════════════════"
if [ "$DRY_RUN" = true ]; then warn "[DRY RUN] 실제 파일은 변경하지 않습니다."; fi
echo -e "현재 프로젝트 이름: ${BOLD}${CURRENT_NAME}${NC}"
if [ "$CURRENT_NAME" != "nestjs-ddd-template" ]; then
  warn "이미 부트스트랩된 프로젝트로 보입니다. 계속하면 이름을 다시 바꿉니다."
fi
echo ""

# ── 1. 프로젝트 이름 ─────────────────────────────
if [ "$ASSUME_YES" = true ]; then
  PROJECT_NAME="$CURRENT_NAME"
else
  read -r -p "$(echo -e "${BOLD}프로젝트 이름${NC} (kebab-case, 예: my-service) [${CURRENT_NAME}]: ")" PROJECT_NAME
  PROJECT_NAME="${PROJECT_NAME:-$CURRENT_NAME}"
fi
if ! echo "$PROJECT_NAME" | grep -qE '^[a-z][a-z0-9-]*$'; then
  err "이름은 소문자/숫자/하이픈(kebab-case)만 허용됩니다: '$PROJECT_NAME'"
  exit 1
fi

# ── 2. 프로젝트 설명 ─────────────────────────────
CURRENT_DESC="$(node -p "require('./package.json').description || ''" 2>/dev/null || echo '')"
if [ "$ASSUME_YES" = true ]; then
  PROJECT_DESC="$CURRENT_DESC"
else
  read -r -p "$(echo -e "${BOLD}프로젝트 설명${NC} [${CURRENT_DESC}]: ")" PROJECT_DESC
  PROJECT_DESC="${PROJECT_DESC:-$CURRENT_DESC}"
fi

echo ""
info "변경 예정:"
echo "  - package.json name        : $CURRENT_NAME → $PROJECT_NAME"
echo "  - package.json description  : $PROJECT_DESC"
echo "  - docker-compose container  : ${PROJECT_NAME}-mariadb"
echo ""

if [ "$DRY_RUN" = false ]; then
  # package.json name (line 단위 치환, 포맷 보존)
  sed_inplace "s|\"name\": \"${CURRENT_NAME}\"|\"name\": \"${PROJECT_NAME}\"|" package.json
  # package.json description
  if [ -n "$PROJECT_DESC" ]; then
    ESCAPED_DESC="$(printf '%s' "$PROJECT_DESC" | sed 's/[&/|]/\\&/g')"
    sed_inplace "s|\"description\": \"[^\"]*\"|\"description\": \"${ESCAPED_DESC}\"|" package.json
  fi
  # docker-compose container_name (기존 *-mariadb 패턴을 새 이름으로)
  sed_inplace "s|container_name: [a-z0-9-]*-mariadb|container_name: ${PROJECT_NAME}-mariadb|" docker-compose.local.yml
  info "✓ 이름/설명/컨테이너명 변경 완료"
fi

# ── 3. .env.development 생성 (없을 때만) ─────────
echo ""
if [ -f ".env.development" ]; then
  warn ".env.development 이미 존재 — 건드리지 않습니다."
else
  DO_ENV="y"
  if [ "$ASSUME_YES" = false ]; then
    read -r -p "$(echo -e "${BOLD}.env.development를 .env.example에서 생성할까요?${NC} (Y/n): ")" DO_ENV
    DO_ENV="${DO_ENV:-y}"
  fi
  if [ "$DO_ENV" = "y" ] || [ "$DO_ENV" = "Y" ]; then
    if [ "$DRY_RUN" = false ]; then
      cp .env.example .env.development
      info "✓ .env.development 생성 (값을 본인 환경에 맞게 채우세요)"
    else
      echo "  [DRY RUN] cp .env.example .env.development"
    fi
  fi
fi

# ── 4. git 히스토리 초기화 (선택) ────────────────
echo ""
DO_GIT="n"
if [ "$ASSUME_YES" = false ]; then
  read -r -p "$(echo -e "${BOLD}git 히스토리를 초기화할까요?${NC} (템플릿 커밋 삭제 후 새 init) (y/N): ")" DO_GIT
  DO_GIT="${DO_GIT:-n}"
fi
if [ "$DO_GIT" = "y" ] || [ "$DO_GIT" = "Y" ]; then
  if [ "$DRY_RUN" = false ]; then
    rm -rf .git
    git init -q
    git add -A
    git commit -q -m "🎉 init: ${PROJECT_NAME}"
    info "✓ git 히스토리 초기화 + 첫 커밋 생성"
  else
    echo "  [DRY RUN] rm -rf .git && git init && git add -A && git commit"
  fi
else
  echo "  git 히스토리는 그대로 둡니다."
fi

# ── 완료 ─────────────────────────────────────────
echo ""
info "════════════════════════════════════════"
info " 부트스트랩 완료: ${PROJECT_NAME}"
info "════════════════════════════════════════"
echo "다음 단계:"
echo "  1. .env.development 값 채우기 (DB·JWT 시크릿 등)"
echo "  2. npm install"
echo "  3. npm run docker:up:dev && npm run prisma:migrate:dev"
echo "  4. npm run start:dev"
echo ""
