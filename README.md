# politics-agents

대한민국 지방정치에 참여하려는 시민을 위한 다중 에이전트 도구 모음.

- 자료를 수집·정제해 인용 가능한 문서로 만들기(자산화)
- GitHub Copilot CLI · VS Code Copilot Chat · Codex CLI · Claude Code에서 같은 자산을 공유
- Google NotebookLM 연동으로 음성·Q&A 열람

모든 자격증명·캐시·결과물은 로컬에 남고 외부로 자동 전송되지 않습니다. 전역 설치가 필요하면 항상 동의를 먼저 묻습니다.

## How To

### Setup

사전 준비:

| 항목 | Windows | macOS |
| --- | --- | --- |
| Git | `winget install Git.Git` | `brew install git` |
| VS Code | `winget install Microsoft.VisualStudioCode` | `brew install --cask visual-studio-code` |
| PowerShell 7 | `winget install Microsoft.PowerShell` | (불필요) |

저장소를 받고 환경 설정 스크립트를 실행합니다. 스크립트는 무엇을 설치할지 보여주고 동의를 받습니다. 미리 보려면 `-DryRun` / `--dry-run`.

```pwsh
# Windows (PowerShell 7)
git clone https://github.com/luncliff/politics-agents.git
cd politics-agents
pwsh -ExecutionPolicy Bypass -File scripts/setup.ps1
```

```zsh
# macOS (zsh)
git clone https://github.com/luncliff/politics-agents.git
cd politics-agents
zsh scripts/setup.sh
```

설치 후보: Node 24 LTS, `gh`, `@github/copilot`, [`uv`](https://docs.astral.sh/uv/), (선택) Java 11+, Rancher Desktop. `보관함/legalize-kr` 등 연관 저장소는 shallow clone으로 준비됩니다. GitHub CLI 로그인은 `gh auth login`.

### Use with Copilot CLI

```pwsh
copilot
copilot --continue
```

세션 시작 시 정책 배너가 출력되고, 위험 명령은 차단/경고됩니다. `chat.tools.urls.autoApprove` · `chat.tools.terminal.autoApprove` 화이트리스트는 VS Code와 공유됩니다.

자주 쓰는 호출:

```pwsh
copilot --model=auto --allow-all-urls --add-dir . --prompt "/find-night-clinic with current location.txt"
```

### Release Tag

Git tag는 HeadVer (`{head}.{yearweek}.{build}`) 형식을 사용합니다. 태그 문자열이 필요하면 LINE [headver](https://github.com/line/headver) 의 PowerShell 예제를 고정 commit raw URL로 임시 파일에 내려받아 실행합니다.

```pwsh
$uri = "https://raw.githubusercontent.com/line/headver/6ed931631cfe18a17518271432abda293ae18228/examples/headver.ps1"
$temp = Join-Path ([System.IO.Path]::GetTempPath()) ("headver-{0}.ps1" -f [guid]::NewGuid().ToString("N"))
try {
    Invoke-WebRequest -Uri $uri -OutFile $temp -ErrorAction Stop
    pwsh -NoProfile -File $temp -Head 0 -Build 0
} finally {
    if (Test-Path $temp) {
        Remove-Item $temp -Force
    }
}
```

새 tag를 원격에 push하면 GitHub Actions가 같은 이름의 prerelease를 자동 생성합니다.

### Use with Codex CLI

같은 워크스페이스의 `.claude/agents/`·`.claude/commands/`·`.agents/skills/`·`.vscode/mcp.json`을 그대로 사용합니다.

1. 저장소 루트에서 Codex 세션을 시작합니다(워크스페이스 트러스트 필수).
2. 첫 응답에서 [AGENTS.md](AGENTS.md)의 규칙(특히 citation·PII·destructive command 가드)을 따르는지 확인합니다.
3. MCP 서버는 `.vscode/mcp.json` 정의를 그대로 사용하므로 Codex 측 자격증명만 별도 점검합니다.
4. 세션 종료 직전 `write-retro` 스킬을 호출해 회고를 남깁니다.

### Use with Claude Code

- Subagents: `.claude/agents/*.md` (lawyer, ordinance, korea-gov-scraper, persona-panel, party-advisor)
- Slash commands: `.claude/commands/*.md` (`/retro`, `/brief`, `/persona-review`, `/collect`, `/health`, `/diagnose-prompts`, `/improve-harness`, `/track-goals`)
- Hooks: `.claude/settings.json` (SessionStart, Stop, PreToolUse Bash 가드)
- MCP: `.mcp.json`

상세 채널 설정은 [AGENTS.md](AGENTS.md)의 `채널별 설정` 섹션.

### Copilot Agent Source

GitHub Copilot은 `.claude/agents/*.md`와 `.claude/commands/*.md`를 공용 소스로 함께 활용합니다.

### Use in VS Code

1. `code .` 으로 워크스페이스 열기.
2. 권장 확장 설치 알림이 뜨면 모두 설치.
3. `Ctrl+Shift+P` → `Tasks: Run Task` 에서 작업 선택.

| Task | 동작 |
| --- | --- |
| `civic: setup` | 환경 설정(또는 변경 후 재실행) |
| `civic: copilot session continue` | Copilot CLI 세션 시작(정책 배너 포함) |
| `civic: notebooklm login` | NotebookLM 브라우저 로그인/세션 갱신 |
| `civic: notebooklm doctor` | NotebookLM CLI/MCP 상태 점검 |
| `civic: notebooklm notebook list` | 연결된 NotebookLM 노트북 목록 조회 |
| `civic: lint prompts/skills` | 프롬프트·스킬 형식 검사 |
| `civic: auth-purge` | 자격증명·로컬 캐시 정리 |
| `civic: fetch nemotron personas (download)` | Nemotron-Personas-Korea parquet 다운로드 |
| `civic: sample nemotron panel (national 600)` | 전국 시민 페르소나 패널 600명 추출 |
| `civic: sample nemotron panel (local from location.txt)` | 지역 시민 페르소나 패널 300명 추출 |

채팅창 자연어 예시:

- "최근 한 달치 OO시의회 본회의 회의록을 받아서 표결 결과 표로 정리해줘"
- "이 조례안의 쟁점을 사실/해석으로 나눠 한 페이지 브리핑으로 만들어줘"
- "/persona-review 보관함/결과/<문서경로> both 10"

위험한 명령(파일 삭제·외부 호출)은 확인 다이얼로그가 뜹니다. 같은 도메인을 한 번 허용하면 다음부터 자동 승인됩니다.

## Result Locations

| 폴더 | 내용 |
| --- | --- |
| `보관함/다운로드/` | 원본 그대로 (수정·삭제 금지) |
| `보관함/결과/` | 사람이 읽기 좋은 정제 Markdown |
| `보관함/양식/` | 공문서 양식 · 작성 지침 보관 |
| `notebooks/<slug>/` | NotebookLM 업로드 묶음 |
| `회고/` | 매 세션 회고 — 다음 사용 시 참고 |

## Documentation

| 대상 | 문서 |
| --- | --- |
| Agent 규칙 (저장소 전체) | [AGENTS.md](AGENTS.md) |
| 문서 폴더 규칙 | [문서/AGENTS.md](문서/AGENTS.md) |
| 채널별 설정 | [AGENTS.md](AGENTS.md) |
| 보안 정책 | [SECURITY.md](SECURITY.md) |
| 지역 참조 자료 | [문서/참고자료-경기도-성남시.md](문서/참고자료-경기도-성남시.md) |

## License

코드와 문서는 **CC0 1.0 Universal**(공공도메인 헌정). [LICENSE](LICENSE) 참조.
HeadVer 계산에 쓰는 LINE `headver` PowerShell 예제 스크립트는 upstream Apache-2.0 라이선스를 따릅니다.
수집된 정부 자료는 별도 라이선스(공공누리 등)를 따르며, 산출물에 출처를 명시합니다.
