# 채널별 설정

이 문서는 Copilot, Codex CLI, Claude Code 설정 파일의 위치만 정리한다. 실제 규칙은 루트 [AGENTS.md](../AGENTS.md)와 각 하위 폴더의 `AGENTS.md`를 따른다.

| 채널 | 위치 | 용도 |
| --- | --- | --- |
| GitHub Copilot | `.github/` + `.claude/` | Copilot instructions/hooks + shared agents/commands |
| Codex CLI | `.codex/` | Codex config, agents |
| Claude Code | `.claude/` | Claude commands, agents, settings |
| VS Code | `.vscode/` | workspace tasks, MCP, toolsets |

채널별 파일에는 AGENTS 규칙을 중복 작성하지 않는다.
