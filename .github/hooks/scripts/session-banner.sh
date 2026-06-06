#!/usr/bin/env bash
# session-banner.sh — Copilot CLI 세션 시작 배너
set -eu

cat >&2 <<'BANNER'
─────────────────────────────────────────────────────────────
 politics-agents — Copilot CLI 세션 시작
 • 워크스페이스-로컬 원칙: 전역 변경은 동의 후 진행
 • 출처 의무: 외부 자료 산출물에는 URL/시각/sha256 포함
 • PII: 필요 최소 수집, 공개 전 수동 점검
 • 회고: 세션 종료 시 retrospectives/ 기록
─────────────────────────────────────────────────────────────
BANNER
exit 0
