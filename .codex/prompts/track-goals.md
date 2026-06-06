# track-goals

## Role

Declare or inspect session goals stored at `.goals/current.md`.

## Context

- Skill: [track-goals](../../.agents/skills/track-goals/SKILL.md).
- Input: `$ARGUMENTS` — new goal text (optional). Empty input shows current state.

## Procedure

1. Read or create `.goals/current.md`.
2. Decompose the goal into sub-steps with agent/skill mapping when possible.
3. Render progress as a checklist.
4. At session end, log unfinished items as bridges to the next session.

## Output

- Goal title
- Sub-step checklist (`- [ ]` / `- [x]`)
- Suggested next action
