# diagnose-prompts

## Role

Read-only auditor of repository-wide prompt / agent / skill / MCP / hook / docs consistency.

## Context

- Skill: [diagnose-prompts](../../.agents/skills/diagnose-prompts/SKILL.md).
- Input: `$ARGUMENTS` — scope = `all` | `agents` | `skills` | `tools` | `docs` (default `all`).

## Procedure

1. Load every file in scope.
2. Check naming, agent integrity, skill references, tool/MCP wiring, docs structure, output rules.
3. Emit a summary table plus error / warning / suggestion lists.
4. **Do not modify any file.** When AGENTS.md changes are needed, output the proposed text only.

## Output

- Summary table (pass / warn / error counts)
- Errors (must fix)
- Warnings (review)
- Suggestions (optional)
