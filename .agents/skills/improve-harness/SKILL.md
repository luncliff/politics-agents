---
name: improve-harness
description: "사용자가 명시적으로 요청한 경우에만 retrospective 누적물을 분석해 반복 패턴을 식별하고, 구조화된 질문에 대한 답변에 따라 skill/agent/hook/참조문서를 갱신."
---

# improve-harness

## Harness Engineering 개요

"Harness"란 AI agent 시스템이 신뢰성 있게 작동하도록 감싸는 **설정·규칙·자동화 레이어** 전체를 말한다. 이 저장소에서 harness는 다음 구성요소로 이루어진다:

| 구성요소 | 위치 | 역할 |
|---|---|---|
| **Skills** | `.agents/skills/<verb-noun>/SKILL.md` | 재사용 가능한 단일 목적 작업 단위 |
| **Agents** | `.claude/agents/`, `.codex/agents/` | 도메인 전문 페르소나·서브에이전트 |
| **Prompts / Commands** | `.claude/commands/`, `.codex/prompts/` | 채널별 사용자 진입점 |
| **Hooks** | `.claude/settings.json`, `.github/hooks/` | 세션 시작·종료·명령 전후 자동 트리거 |
| **MCP 설정** | `.vscode/mcp.json`, `.mcp.json` | 외부 도구 연결(legalize-kr, notebooklm 등) |
| **명명 규약** | `.agents/CONVENTIONS.md` | 일관된 식별자 체계 |
| **AGENTS.md 계층** | `AGENTS.md`, `*/AGENTS.md` | 범위별 행동 규칙 |

### Agentic Harness Engineering 원칙 (공개 가이드 정리)

**Anthropic Claude Code — subagents best practice**

- 서브에이전트는 단일 책임(Single Responsibility). 하나의 에이전트에 너무 많은 도메인을 넣지 않는다.
- `description`의 **"Use when:"** 절이 명확할수록 모델이 자동 선택 정확도가 높아진다.
- `CLAUDE.md`(= 이 저장소의 `AGENTS.md`)를 세션 시작에 자동으로 읽힌다 — 규칙 중복 작성 금지.
- 참조: <https://docs.anthropic.com/en/docs/claude-code/sub-agents>

**OpenAI Codex CLI — prompting guide**

- 짧은 명령형 식별자(`brief`, `collect`, `retro`)가 긴 명사구보다 호출 안정성이 높다.
- `developer_instructions`에 **Role / Context / Procedure / Output** 4섹션 구조를 쓰면 모델이 일관된 출력을 만든다.
- 참조: <https://github.com/openai/codex> (README `# Custom instructions`)

**LLM-powered autonomous agent patterns (Lilian Weng, 2023)**

- Planning: 목표를 하위 작업으로 분해(task decomposition). 이 저장소의 `track-goals` skill이 담당.
- Memory: 단기(세션 컨텍스트) + 장기(`회고/*.md`, `.goals/current.md`). 회고를 harness 개선 루프에 연결하는 것이 핵심.
- Tool use: 외부 API·파일시스템·MCP를 통해 agent 능력을 확장. 과도한 권한은 `pre-tool-bash.ps1` 훅으로 차단.
- 참조: <https://lilianweng.github.io/posts/2023-06-23-agent/>

**Retrospective-driven improvement loop (이 저장소 패턴)**

1. 세션 종료 → `write-retro` 로 회고 저장
2. 충분한 회고 누적(≥ 3 세션) → `improve-harness` 실행
3. 반복 패턴 → skill/agent/hook 생성 또는 강화
4. 갱신된 harness → 다음 세션부터 적용

## 입력

- `$ARGUMENTS`: (선택) 분석할 retrospective 수. 생략 시 전체.

## 절차

### 1. 회고 수집

`회고/*.md`를 읽어 다음을 추출:

- `## 막힌 것` 항목 전체
- `## 자동화 후보` 항목 전체
- `## 새로 알게 된 사이트·포맷·정책` 항목 전체
- `## 성공한 것` 중 반복 성공 패턴

### 2. 패턴 식별

추출된 항목을 교차 비교하여:

| 패턴 유형 | 조건 | 처리 후보 |
|---|---|---|
| 반복 차단 | 같은 "막힌 것"이 2회 이상 | skill 또는 hook 생성 후보 |
| 미구현 자동화 후보 | "자동화 후보"에 등록 후 아직 구현 안 됨 | 우선순위 질문 |
| 반복 사이트 발견 | 같은 사이트가 2회 이상 "새로 알게 된" | `문서/` 기존 참조 문서 보강 후보 |
| 반복 성공 패턴 | 같은 접근법이 효과적으로 2회 이상 사용됨 | skill 규칙 강화 또는 AGENTS.md 규칙 후보 |

### 3. 사용자 질문

식별된 패턴을 우선순위순으로 정리하고, 각각에 대해 구조화된 질문:

- "X가 N회 반복됩니다. 자동화할까요? [skill / hook / 보류]"
- "Y 사이트를 references에 추가할까요? [추가 / 보류]"
- "Z 규칙을 기존 스킬에 반영할까요? [반영 / 보류]"

한 번에 3개 이하의 질문만 던진다. 나머지는 다음 실행으로 이월.

### 4. 답변 기반 실행

사용자 답변에 따라:

| 답변 | 실행 |
|---|---|
| skill 생성 | `.agents/skills/<verb-noun>/SKILL.md` stub 작성 |
| hook 생성 | 대상 채널의 설정 파일에 hook 추가 (Claude: `.claude/settings.json`, Copilot: `.github/hooks/`) |
| references 추가 | `문서/` 기존 참조 문서에 항목 append |
| 스킬 규칙 강화 | 해당 `.agents/skills/<name>/SKILL.md`에 규칙 추가 |
| AGENTS.md 규칙 후보 | **직접 수정하지 않음** — 후보 텍스트만 출력하고 사용자가 별도 확인 후 반영 |
| 보류 | 기록만 남기고 다음 실행까지 이월 |

### 5. 실행 기록

처리 결과를 `.goals/feedback-log.md`에 append:

```markdown
## YYYY-MM-DD

- 패턴: <설명>
- 결정: <사용자 선택>
- 실행: <수행한 변경 요약>
```

## 제약

- AGENTS.md를 직접 수정하지 않는다. 제안만 출력.
- 생성하는 skill stub의 이름은 `verb-noun` 규칙을 따른다.
- 생성하는 agent stub의 이름은 역할 noun을 따른다.
- 채널별 설정 파일만 해당 채널 폴더에서 수정한다:
  - Claude Code: `.claude/`
  - GitHub Copilot: `.github/`
  - Codex CLI: `.codex/`
  - VS Code: `.vscode/`
- 한 번 실행에 최대 3건의 변경만 수행. 나머지는 이월.
- PII가 포함된 retrospective 내용은 feedback-log에 옮기지 않는다.

## 트리거 조건

사용자가 `/improve-harness` 또는 `improve-harness`을 명시적으로 요청한 경우에만 실행한다. 자동 트리거 금지.

## 참고 자료

| 자료 | 링크 | 핵심 내용 |
|---|---|---|
| Claude Code subagents guide | <https://docs.anthropic.com/en/docs/claude-code/sub-agents> | Single responsibility, "Use when:", AGENTS.md 자동 로드 |
| Codex CLI README | <https://github.com/openai/codex> | Role/Context/Output 구조, 짧은 식별자 |
| LLM Powered Autonomous Agents (Weng) | <https://lilianweng.github.io/posts/2023-06-23-agent/> | Planning·Memory·Tool use 3요소 |
| ReAct: Synergizing Reasoning and Acting | <https://arxiv.org/abs/2210.03629> | 추론(Thought)+행동(Act)+관찰(Observe) 루프 |
| Anthropic Model Specification | <https://anthropic.com/model-spec> | 안전·윤리 제약이 harness 규칙 설계에 미치는 영향 |
