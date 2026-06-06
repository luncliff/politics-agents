# .agents/AGENTS.md — Skills & agents conventions

Scope: `.agents/` 내 skill·agent 정의. 공통 규약은 [/AGENTS.md](../AGENTS.md). 명명 규약은 [CONVENTIONS.md](CONVENTIONS.md).

## 구성

- `skills/<verb-noun>/SKILL.md` — 재사용 가능한 작업 단위 (예: `write-retro`, `track-goals`).
- 에이전트 정의는 `.claude/agents/`, `.codex/agents/`에 두고 Copilot은 `.claude/agents/`를 공용으로 활용.

## 추가 기준

- 같은 작업이 두 번 반복되면 **skill 후보**로 회고에 기록한다.
- 같은 도메인 페르소나가 두 번 반복되면 **agent 후보**로 회고에 기록한다.
- 채널 간 동작이 일치해야 하면 skill로, 채널 특화 동작이면 agent로 분리한다.
- agent·skill이 재사용 템플릿, 양식, 작성 안내, template guidance 파일을 생성·갱신할 때는 `보관함/양식/`을 기본 경로로 사용한다.
- template/guidance 산출물을 `문서/`나 `보관함/결과/`에 새로 만들지 않는다. 단, 사용자가 명시한 일회성 분석 결과는 `보관함/결과/`에 둔다.

## 도구 우선순위 (skill·agent 호출 시)

1. MCP 서버 (`legalize-kr`, `notebooklm`) — 인용·해시·데이터 통합.
2. `.agents/skills/` 명령 — 안전 가드 통과.
3. IDE 빌트인 (Copilot: `#fetch`, `#problems` / Claude Code: `WebFetch`, `Glob`, `Grep`).
4. 터미널 / Bash — 사전 승인된 패턴만 무인 실행.

## 회고 의무

세션 종료 시 `write-retro` 스킬 또는 `/retro` 명령을 호출. 자세한 절차는 해당 SKILL.md 참고.
