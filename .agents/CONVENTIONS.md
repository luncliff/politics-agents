# Agent & Skill Naming Conventions

## Skills (`.agents/skills/<verb-noun>/SKILL.md`)

이름은 **verb-noun** 형식을 강제한다. `local-` 접두는 `location.txt`로 지역이 결정되므로 사용하지 않는다.

| 형식 | 예시 |
|---|---|
| `verb-noun` | `track-budget`, `track-funds`, `track-timeline`, `track-transit`, `collect-ordinance`, `review-persona`, `review-alignment-theminjoo`, `write-retro`, `find-night-clinic`, `add-vscode-task`, `improve-harness`, `track-goals`, `diagnose-prompts` |

## Agents

에이전트 식별자는 모든 채널에서 **동일한 짧은 noun 또는 noun-noun**을 쓴다. `-agent` 접미는 폐지한다(파일명·frontmatter `name`·호출자 모두).

| 채널 | 위치 | 파일명 패턴 |
|---|---|---|
| Claude Code | `.claude/agents/<noun>.md` | `lawyer.md`, `ordinance.md`, `persona-panel.md`, `korea-gov-scraper.md`, `party-advisor.md` |
| GitHub Copilot | `.claude/agents/<noun>.md` (공유) | `lawyer.md`, `ordinance.md`, `persona-panel.md`, `korea-gov-scraper.md`, `party-advisor.md` |
| Codex CLI | `.codex/agents/<noun>.toml` | `lawyer.toml`, `ordinance.toml`, `persona-panel.toml`, `korea-gov-scraper.toml`, `party-advisor.toml` |

채널 간 베이스명은 일치해야 한다. 동일 도메인은 단일 에이전트로 통합하고, 모드는 인자로 분기한다(예: `ordinance collect|brief`).

## Prompts / Commands

명령 원문은 `.claude/commands/`를 기준으로 유지하고, Codex는 `.codex/prompts/`에서 같은 이름으로 미러링한다.

| 명령 | Canonical | Codex mirror |
|---|---|---|
| `collect` | `.claude/commands/collect.md` | `.codex/prompts/collect.md` |
| `brief` | `.claude/commands/brief.md` | `.codex/prompts/brief.md` |
| `retro` | `.claude/commands/retro.md` | `.codex/prompts/retro.md` |
| `persona-review` | `.claude/commands/persona-review.md` | `.codex/prompts/persona-review.md` |
| `diagnose-prompts` | `.claude/commands/diagnose-prompts.md` | `.codex/prompts/diagnose-prompts.md` |
| `improve-harness` | `.claude/commands/improve-harness.md` | `.codex/prompts/improve-harness.md` |
| `track-goals` | `.claude/commands/track-goals.md` | `.codex/prompts/track-goals.md` |
| `health` | `.claude/commands/health.md` | `.codex/prompts/health.md` |

채널별 best practice는 frontmatter / 본문 구조에서만 분기한다.

- `.claude/`: Claude Code subagents 가이드 — frontmatter 최소(`name`, `description`), 본문은 절차적 지시.
- `.codex/`: ChatGPT prompting guide + Codex CLI prompting guide — `developer_instructions`(또는 prompt 본문)에 **Role / Context / Procedure / Output** 섹션 표준화, 짧은 명령형.
- Copilot: `.claude/agents/`와 `.claude/commands/` 공용 정의를 우선 참조.

## Channel-Specific Files

채널별 설정/정의 파일은 각 채널 폴더에서만 관리한다.

| 채널 | 설정 위치 |
|---|---|
| Claude Code | `.claude/` |
| GitHub Copilot | `.github/` (instructions, hooks) + `.claude/` (agents, commands) |
| Codex CLI | `.codex/` |
| VS Code | `.vscode/` |

공통 skill은 `.agents/skills/`에 두고, 채널별 파일에서 참조한다.

## SKILL.md 규약 (Anthropic skills 형식)

- YAML frontmatter `name` / `description` 필수.
- `description` 첫 문장은 동사로 시작한다.
- `Use when:` 절을 description 또는 본문 상단에 둔다.
- 재사용 템플릿은 `references/`에 두고, 산출물은 `보관함/양식/` 또는 `보관함/결과/`에 저장한다.
