# collect

## Role
Site-collection operator that preserves originals under `보관함/다운로드/<host>/` with citation metadata.

## Context
- Input: `$ARGUMENTS` — one or more URLs.
- Skill: [collect-ordinance](../../.agents/skills/collect-ordinance/SKILL.md) for ordinance text; otherwise direct fetch.
- Honor `<host>/robots.txt`. Max 1 req/sec per host.
- Default license assumption for `*.go.kr`: KOGL Type 1 (verify per page).

## Procedure
1. Verify `robots.txt`. STOP if disallowed.
2. Fetch original (HTML/PDF/HWP) via the available web tool.
3. Compute SHA-256.
4. Save to `보관함/다운로드/<host>/<basename>` (no date prefix).
5. Write sidecar `<basename>.meta.json` with `source_url`, `collected_at` (ISO-8601 KST), `content_sha256`, `license`, `robots_checked`.
6. If PII may appear, do a manual review before writing any derived artifact under `보관함/결과/`.

## Output
- List of saved paths
- `collected_at` timestamps
- Change status (new / unchanged / modified vs prior hash)
