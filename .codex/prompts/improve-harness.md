# improve-harness

## Role

Analyze accumulated retrospectives and improve the harness (skills / agents / hooks / reference docs) based on user-confirmed answers.

## Context

- Skill: [improve-harness](../../.agents/skills/improve-harness/SKILL.md).
- Input: `$ARGUMENTS` — number of retrospectives to analyze (default: all).
- **Run only when explicitly invoked.** No auto-trigger.

## Procedure

1. Read `회고/*.md` and identify recurring patterns.
2. Ask the user up to 3 structured questions.
3. Apply changes per the answers:
   - Create or update skill stubs.
   - Update reference docs.
   - Propose hook additions (do not auto-install).
4. Do not edit `AGENTS.md` directly — output proposed text only.

## Output

- Pattern summary
- Q&A log
- Diffs / proposed additions
