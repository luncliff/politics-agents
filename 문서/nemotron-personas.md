---
title: Nemotron-Personas-Korea 데이터셋
source_url: https://huggingface.co/datasets/nvidia/Nemotron-Personas-Korea
license: CC BY 4.0
---

# Nemotron-Personas-Korea

대한민국 인구통계·지리·성격 분포에 정렬된 합성 페르소나 데이터셋.
본 저장소는 시민 페르소나 패널 시뮬레이션의 입력 자료로 사용한다.

## 핵심 사실 (입증됨)

- 발행: NVIDIA Corporation, 2026-04-20
- 라이선스: **Creative Commons Attribution 4.0 International (CC BY 4.0)** — 상업·비상업 모두 허용, **저작자표시 의무**
- 규모: 100만 레코드, 700만 페르소나 텍스트, 1.7B 토큰, 약 2.0 GB
- 필드: 26개 (페르소나 7 + 페르소나 속성 6 + 인구통계·지리 컨텍스트 12 + uuid 1)
- 커버리지: 17개 시도 + 252개 시군구
- 대상: **만 19세 이상 성인만** 포함
- 합성 근거: KOSIS, 대법원, 국민건강보험공단(공공누리 0유형), 한국농촌경제연구원(공공누리 4유형), NAVER Cloud
- 생성 방식: NVIDIA NeMo Data Designer + 자체 PGM + google/gemma-4-31B-it (Apache-2.0)

## 활용 (본 저장소 한정)

| 단계 | 산출물 |
| --- | --- |
| 원본 보존 | `보관함/다운로드/huggingface.co/datasets/nvidia/Nemotron-Personas-Korea/*.parquet` (.gitignore) |
| 인용 메타 | 같은 경로 `*.parquet.meta.json` (sha256, source_url, license) |
| 전국 패널 | `보관함/결과/<YYYY-MM-DD> Nemotron 전국 패널 300.{jsonl,md}` |
| 지역 패널 | `보관함/결과/<YYYY-MM-DD> Nemotron <district> 패널 100.{jsonl,md}` |
| 시민 검토 | `보관함/결과/<YYYY-MM-DD> <slug>.md` |

## 어댑터·도구

- 어댑터: [tools/nemotron_personas/](../tools/nemotron_personas/)
  - `python -m nemotron_personas.fetch [--dry-run|--force]`
  - `python -m nemotron_personas.sampler --panel {national|local} --size N --seed N`
- 스크립트: [scripts/fetch_nemotron_personas.ps1](../scripts/fetch_nemotron_personas.ps1)
- VS Code Task: `civic: fetch nemotron personas (dry-run|download)`,
  `civic: sample nemotron panel (national 600|local from location.txt)`
- 스킬: [.agents/skills/review-persona/SKILL.md](../.agents/skills/review-persona/SKILL.md)
- 에이전트: [.claude/agents/persona-panel.md](../.claude/agents/persona-panel.md)
- 명령: [.claude/commands/persona-review.md](../.claude/commands/persona-review.md)

## 정책 (본 저장소)

- **이름 필드 미사용**: 합성이지만 동명이 가능하므로 카드 라이브러리에서 `name`/성씨 필드 제외.
- **PII 추가 금지**: 합성 페르소나에 연락처·주소·실제 SNS 등 추가 PII 결합 금지.
- **footer 의무**: 모든 파생 산출물에 `출처: NVIDIA Nemotron-Personas-Korea (CC BY 4.0)`와
  합성 면책 문구를 포함한다(AGENTS.md §2.2 출처 의무 + §2.4 정치적 중립).
- **시뮬레이션 표기**: 페르소나 응답은 여론조사 결과로 일반화하지 않는다.
- **데이터 한계 고지**: 19세 미만, 외국인 거주민, gender(생물학적 sex와 구분) 정보는 데이터셋에 부재 → 누락된 관점으로 명시.

## 인용

```
@software{nvidia/Nemotron-Personas-Korea,
  author = {Kim, Hyunwoo and Ryu, Jihyeon and Lee, Jinho and Ryu, Hyungon and Praveen, Kiran and Prayaga, Shyamala and Thadaka, Kirit and Jennings, Will and Sadeghi, Bardiya and Sharabiani, Ashton and Choi, Yejin and Meyer, Yev},
  title  = {Nemotron-Personas-Korea: Synthetic Personas Aligned to Real-World Distributions for Korea},
  month  = {April},
  year   = {2026},
  url    = {https://huggingface.co/datasets/nvidia/Nemotron-Personas-Korea}
}
```
