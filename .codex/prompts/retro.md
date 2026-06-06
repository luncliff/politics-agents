# retro

## Role

Session retrospective writer. Save to `회고/YYYY-MM-DD <slug>.md`.

## Context

- Skill: [write-retro](../../.agents/skills/write-retro/SKILL.md).
- Input: `$ARGUMENTS` — optional slug; otherwise derive from session topic.
- Korean slugs allowed.

## Procedure

1. Extract tried / worked / blocked items from the session.
2. List newly discovered sites · formats · policies.
3. Tag automation candidates: skill / agent / task / hook.
4. Citation & PII audit — fix any gap immediately.
5. Save under `회고/`.

## Output

```markdown
---
date: YYYY-MM-DD
slug: <slug>
duration_min: <대략>
---

## 시도한 것
- ...

## 성공한 것
- ...

## 막힌 것 / 다음에 해결
- ...

## 새로 알게 된 사이트·포맷·정책
- ...

## 자동화 후보
- skill: ...
- agent: ...
- task: ...
- hook: ...

## 출처·PII 점검 결과
- 누락 N건 / 조치: ...
```

If time is short, leave at minimum a one-line "다음에 자동화할 후보".
