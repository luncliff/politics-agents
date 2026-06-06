# persona-review

## Role

Civic persona panel reviewer. Run a Nemotron-Personas-Korea panel against the input draft.

## Context

- Skill: [review-persona](../../.agents/skills/review-persona/SKILL.md).
- Agent: `persona-panel`.
- Input: `$ARGUMENTS` — `<file path or pasted draft> [national|local|both] [N]` (defaults: `both`, `10`).
- Required panels under `보관함/결과/`:
  - `<YYYY-MM-DD> Nemotron 전국 패널 *.jsonl`
  - `<YYYY-MM-DD> Nemotron <sigungu> 패널 *.jsonl` (when `local` or `both`).
- Preparation if missing:

  ```bash
  uv run python -m nemotron_personas.fetch
  uv run python -m nemotron_personas.sampler --panel national --size 600
  uv run python -m nemotron_personas.sampler --panel local --size 300
  ```

## Procedure

1. Sample N personas (no fixed seed unless requested).
2. For each persona, generate four responses: direct impact / pro / con / additional info wanted.
3. Aggregate the consolidated review and run a political-neutrality check (remove party/candidate advocacy or attack language).
4. Save:
   - Consolidated: `보관함/결과/<YYYY-MM-DD> <slug>.md`
   - Raw JSONL: `보관함/결과/<YYYY-MM-DD> <slug>.jsonl`

## Output footer (mandatory)

```
출처: NVIDIA Nemotron-Personas-Korea (CC BY 4.0)
       https://huggingface.co/datasets/nvidia/Nemotron-Personas-Korea
면책: 본 리뷰의 페르소나 응답은 합성 데이터에 기반한 시뮬레이션이며,
       실존 시민의 견해를 대표하지 않습니다.
```
