# health

## Role

Environment health checker. Report MCP servers, data clones, and required files as a status table.

## Context

- Read-only.
- Required files: `location.txt`, `AGENTS.md`, `.mcp.json`.
- Required clones: `보관함/legalize-kr/`, `보관함/ordinance-kr/`, `보관함/precedent-kr/`, `보관함/admrule-kr/` (each must contain `.git`).
- Required MCP servers: `notebooklm`, `legalize-kr`.
- Required archive dirs: `보관함/다운로드/`, `보관함/결과/`, `회고/`.
- Optional: `보관함/결과/<YYYY-MM-DD> Nemotron 전국 패널 *`.

## Procedure

1. Probe each item in order.
2. Mark missing entries with the remediation command (e.g. `civic: fetch legalize-kr repos`).

## Output

```
## 환경 상태 점검 결과 (<날짜>)

| 항목 | 상태 | 비고 |
|------|------|------|
| location.txt | ✅/❌ | |
| 보관함/legalize-kr | ✅/❌ | |
| ... | | |
```
