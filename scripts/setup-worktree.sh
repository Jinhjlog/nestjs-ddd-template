#!/usr/bin/env bash
#
# setup-worktree.sh — G 자동화용 워크트리 셋업
#
# git worktree는 git이 추적하는 파일만 체크아웃하므로,
# 비추적 자원(node_modules / prisma generated client / .env*)을 공급해야
# 워크트리 안에서 lint·build가 동작한다.
#
# 사용: 오케스트레이터(Opus)가 `git worktree add <경로> <브랜치>` 직후 1회 실행.
#   bash scripts/setup-worktree.sh <worktree-path> [main-repo-path]
#
# - node_modules / generated (prisma client) : 심링크 (복제 회피, 의존성·스키마 동일 전제)
# - .env*                            : 복사 (격리)
set -euo pipefail

WORKTREE_PATH="${1:?worktree 경로를 첫 번째 인자로 주세요}"
# 메인 레포 경로 (미지정 시 이 스크립트 기준으로 추정)
MAIN_REPO="${2:-$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)}"

if [ ! -d "$WORKTREE_PATH" ]; then
  echo "❌ 워크트리 경로가 없습니다: $WORKTREE_PATH" >&2
  exit 1
fi

echo "[setup-worktree] main=$MAIN_REPO → worktree=$WORKTREE_PATH"

# 1) node_modules 심링크 (이미 있으면 건너뜀)
if [ ! -e "$WORKTREE_PATH/node_modules" ]; then
  ln -s "$MAIN_REPO/node_modules" "$WORKTREE_PATH/node_modules"
  echo "  ✅ node_modules 심링크"
fi

# 2) prisma generated client 심링크 (루트 generated/, schema output = ../generated/prisma)
if [ -e "$MAIN_REPO/generated" ] && [ ! -e "$WORKTREE_PATH/generated" ]; then
  ln -s "$MAIN_REPO/generated" "$WORKTREE_PATH/generated"
  echo "  ✅ generated 심링크"
fi

# 3) .env* 복사 (gitignore라 워크트리에 없음). lint/build엔 사실상 불필요하나 안전 차원.
shopt -s nullglob
for envf in "$MAIN_REPO"/.env*; do
  base="$(basename "$envf")"
  if [ ! -e "$WORKTREE_PATH/$base" ]; then
    cp "$envf" "$WORKTREE_PATH/$base"
  fi
done
echo "  ✅ .env* 복사"

echo "[setup-worktree] 완료 — 워크트리에서 lint/build 가능"
