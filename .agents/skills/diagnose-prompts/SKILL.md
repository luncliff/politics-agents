---
name: diagnose-prompts
description: 저장소 전체의 prompt, agent instructions, tool configuration, document organization을 종합 점검하여 규칙 불일치·누락·중복을 식별하고 수정 제안을 출력.
---

# diagnose-prompts

저장소 내 모든 agent 정의, skill 정의, prompt 템플릿, MCP 설정, hook 구성, 공통 규약 문서를 교차 점검하여 불일치를 보고한다.

## 입력

- `$ARGUMENTS`: (선택) 점검 범위 지정.
  - `all` (기본): 전체 점검
  - `agents`: agent 정의만
  - `skills`: skill 정의만
  - `tools`: MCP/tool 설정만
  - `docs`: 문서 조직만

## 점검 대상 파일

| 카테고리 | 경로 패턴 |
|---|---|
| 공통 규약 | `AGENTS.md` |
| Claude Code agents | `.claude/agents/*.md` |
| Claude Code commands | `.claude/commands/*.md` |
| Claude Code settings | `.claude/settings.json` |
| Claude Code MCP | `.mcp.json` |
| Copilot shared agents/commands | `.claude/agents/*.md`, `.claude/commands/*.md` |
| Copilot instructions | `.github/copilot-instructions.md` |
| Codex agents | `.codex/agents/*.toml` |
| Codex config | `.codex/config.toml` |
| VS Code MCP | `.vscode/mcp.json` |
| VS Code settings | `.vscode/settings.json` |
| 공통 skills | `.agents/skills/*/SKILL.md` |
| Naming conventions | `.agents/CONVENTIONS.md` |
| References | `문서/*.md` |

## 점검 항목

### 1. Naming 규칙 일관성

- skill 이름이 verb-noun 규칙을 따르는지 (신규 skill 대상)
- agent 이름이 역할 noun인지
- 채널 간 같은 agent의 이름 대응이 맞는지 (예: Claude `lawyer` = Copilot `lawyer` = Codex `lawyer`)

### 2. 채널 간 agent 정의 정합성

각 채널에서 같은 역할의 agent를 비교:
- 역할 설명이 의미적으로 동일한지
- 데이터 조회 우선순위가 일치하는지 (Local → MCP → Web)
- 출력 경로 규칙이 일치하는지
- 금지 사항이 일치하는지
- 스킬 참조가 일치하는지

불일치 발견 시 어느 채널이 기준인지 명시하고 diff를 출력.

### 3. Skill ↔ Agent 참조 무결성

- agent가 참조하는 skill이 `.agents/skills/`에 존재하는지
- skill이 참조하는 파일(templates, references)이 존재하는지
- 사용되지 않는 skill이 있는지 (어떤 agent/command에서도 참조 안 됨)

### 4. Tool/MCP 설정 일관성

- `.mcp.json`, `.vscode/mcp.json`, `.codex/config.toml`의 MCP 서버 목록이 동일한지
- agent가 `legalize-kr/*` 도구를 참조하지만 MCP에 해당 서버가 없는 경우
- 환경 변수 의존성이 문서화되어 있는지

### 5. 문서 조직 일관성

- `문서/`에 있는 참조 자료가 agent/skill에서 실제로 참조되는지
- 상호 링크(`[text](path)`)의 대상 파일이 존재하는지
- AGENTS.md의 규칙이 각 agent/skill에 반영되어 있는지

### 6. Output 규칙 일관성

- 모든 agent/skill의 출력 경로가 AGENTS.md의 "Output Formats" 섹션과 일치하는지
- `보관함/결과/` flat 원칙 위반이 없는지
- 파일명 규칙 (`<YYYY-MM-DD> <한글>.<ext>`)이 준수되는지

## 출력 형식

```markdown
## 점검 결과 요약

| 카테고리 | 통과 | 경고 | 오류 |
|---|---|---|---|
| Naming | N | N | N |
| Agent 정합성 | N | N | N |
| Skill 참조 | N | N | N |
| Tool/MCP | N | N | N |
| 문서 조직 | N | N | N |
| Output 규칙 | N | N | N |

## 오류 (즉시 수정 필요)

1. **[카테고리]** 설명 — 파일: 경로, 행: N
   - 현재: ...
   - 권장: ...

## 경고 (검토 권장)

1. **[카테고리]** 설명 — 파일: 경로
   - 현재: ...
   - 권장: ...

## 제안 (선택적 개선)

- ...
```

## 제약

- 이 스킬은 읽기 전용 진단이다. 파일을 직접 수정하지 않는다.
- AGENTS.md 수정이 필요한 경우 제안 텍스트만 출력한다.
- 점검 결과에서 PII가 포함된 파일 내용을 인용하지 않는다.
- 채널 간 불일치 판정 시 AGENTS.md를 기준(source of truth)으로 삼는다.
