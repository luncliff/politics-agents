# Security Policy

지원 브랜치는 `main`만. 다른 브랜치에는 보안 패치를 적용하지 않습니다.

## Reporting

- 공개 이슈로 보고 금지.
- [GitHub Security Advisories](https://github.com/luncliff/politics-agents/security/advisories/new) 또는 owner 메일.
- 포함할 것: 영향 범위, 재현 절차/PoC, 잠재 영향(자격증명·데이터·prompt injection).
- 응답 SLA: 인지 72시간, 해결/완화 7일, 노출 PII 삭제 24시간.

## Forbidden

- 자격증명·토큰·API 키 커밋 금지(어느 브랜치도).
- `main`에 `git push --force` 금지.
- `gitleaks` · `lint` 워크플로 비활성화 금지.
- 마스킹 키 디스크 저장 금지.

## Threat Model

| 위협 | 대응 |
| --- | --- |
| 자격증명 누출 | `.env` · `*.token` · `.copilot/credentials*` gitignore + gitleaks (push/PR) |
| 외부 페이지 prompt injection | `*.go.kr/*` 요청만 자동 승인, **응답은 사람 검토** (`approveResponse: false`) |
| 의도치 않은 전역 변경 | `scripts/setup.*` · Copilot CLI hooks가 동의 게이트 |
| 무인 파괴 명령 | `Bypass Approvals` · `Autopilot` · `/yolo` 비활성, `preToolUse` 훅이 로그/차단 |
| 임의 외부 도메인 호출 | `chat.agent.networkFilter` 화이트리스트 + 신규 도메인 명시 승인 |
| 산출물 PII | 최소 수집 원칙 + 공개 전 수동 점검 |
| 의존성 취약점 | Dependabot · `pyproject.toml`/`package.json` 모니터링 |

## Workspace-local

모든 설정·자격증명·캐시는 저장소 폴더 안에 둡니다.

| 자산 | 위치 | 전역은 |
| --- | --- | --- |
| Copilot CLI | `.copilot/` | `~/.copilot/` 동의 시만 |
| MCP 서버 | `.vscode/mcp.json` | 전역 `mcp.json` 수정 금지 |
| 프롬프트·스킬·에이전트 | `.claude/commands/`, `.agents/skills/`, `.claude/agents/`, `.codex/agents/` | 사용자 prompts 폴더 옵트인 |
| Node | repo `node_modules/` | `npm i -g` setup만, 동의 필요 |
| Python | `.venv/` (uv) | `uv tool install --global` 옵트인 |
| Git config | `.git/config` | `git config --global` 동의 시만 |

## URL Auto-approval

`.vscode/settings.json` `chat.tools.urls.autoApprove`:

- `*.go.kr/*` — 요청 자동, **응답 매번 사람 검토**.
- `docs.github.com`, `code.visualstudio.com`, `modelcontextprotocol.io` — 양쪽 자동.
- `pastebin.com`, `*.ngrok.io` — 차단(`false`).

초기화: `Ctrl+Shift+P` → `Chat: Reset Tool Confirmations` · 검토: `Chat: Manage Tool Approval`.

## Credential Cleanup (auth-purge)

대화형 실행만 허용(비대화형 차단):

```pwsh
pwsh -File scripts/auth-purge.ps1
```

```zsh
zsh scripts/auth-purge.sh
```

처리 항목: `gh auth logout`, `~/.copilot/credentials*` 및 워크스페이스 사본, 셸 프로파일 환경변수 점검(출력만), Windows Credential Manager, macOS Keychain `github.com`, NotebookLM CLI/MCP 인증 데이터.

## Copilot CLI Hooks

`.github/hooks/copilot-cli-policy.json`:

| Hook | Action |
| --- | --- |
| `sessionStart` | 정책 배너 출력 |
| `userPromptSubmitted` | 타임스탬프·cwd → `.github/hooks/logs/audit.jsonl` (gitignored) |
| `preToolUse` | 기본 logging-first; `COPILOT_HOOKS_DENY_DEMO=1`일 때 데모 패턴 차단 |

운영 환경은 `pre-tool-policy.{sh,ps1}`의 deny 패턴을 단계적으로 강화.

## GitHub Actions

| Workflow | Trigger | Purpose |
| --- | --- | --- |
| `gitleaks.yml` | push `main`, PRs | 전체 git 히스토리 시크릿 스캔 |
| `lint.yml` | push `main`, PRs | YAML frontmatter · JSON 형식 검증 |

Hardening:

- `actions/checkout@v4` `fetch-depth: 0`.
- 시크릿은 `GITHUB_TOKEN`만; 장기 PAT 미사용.
- `pull_request_target` 미사용; `workflow_dispatch` 미검증 입력 미사용.
- 외부 Action은 메이저 태그 핀 후 수동 검토 후 bump.

권장(미적용): CodeQL default setup, Dependabot version updates, Secret scanning push protection, `main` branch protection(`gitleaks`/`lint` 통과 필수).

## Code Scanning Alerts

gitleaks가 push/PR 단위로 시크릿 스캔. CodeQL이 활성화된 경우 *Security → Code scanning alerts*에 표시.

| Severity | CVSS | Action |
| --- | --- | --- |
| Critical | 9.0–10.0 | PR merge 차단, 즉시 수정 |
| High | 7.0–8.9 | 다음 릴리스 전 수정 |
| Medium | 4.0–6.9 | 7일 내 triage |
| Low | 0.1–3.9 | 백로그 |

`Test`/`Library` 라벨은 검토 후 dismiss 가능. `Generated` 라벨은 사람 판단 필요.
