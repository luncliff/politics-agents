---
name: review-persona
description: "정책 제안·보도자료·사건 보고·계획 초안을 Nemotron-Personas-Korea 기반 합성 시민 페르소나 패널에 비추어 시점별 시뮬레이션 응답과 종합 리뷰로 정리한다. Use when: 시민 다양성 검토, 연령·지역·직업별 영향 점검, 누락된 관점 발굴, 정책 시안 사전 진단."
argument-hint: "<문서 경로|초안> [national|local|both] [N]"
---

# review-persona

대한민국 인구통계 분포에 정렬된 합성 페르소나(NVIDIA Nemotron-Personas-Korea, CC BY 4.0)
패널을 입력 문서에 적용해, 다양한 시점의 반응과 종합 진단을 산출하는 검토 스킬이다.

## 입력

- `target`: 평가 대상 — 파일 경로 또는 붙여넣은 초안 본문 (필수)
- `panel`: `national` | `local` | `both` (기본 `both`)
- `size`: 패널당 추출할 페르소나 수 (기본 10, 최대 30 권장)
- `seed`: 재현용 정수 시드 (선택). 지정하지 않으면 매 실행마다 무작위 추출(재현 불가)을 수행한다.
- `theme`: 평가 축 키워드 (예: 보육·복지·재정·안전, 선택)

## 자료

- 카드 라이브러리(필수 사전 산출):
  - `보관함/결과/<YYYY-MM-DD> Nemotron 전국 패널 600.jsonl` (전국 stratified)
  - `보관함/결과/<YYYY-MM-DD> Nemotron <sigungu> 패널 300.jsonl` 등 지역 패널
- 카드가 없으면 먼저 다음을 안내한다.
  - `uv run python -m nemotron_personas.fetch`
  - `uv run python -m nemotron_personas.sampler --panel national --size 600`
  - `... --panel local --size 300`

## 절차

1. `target`이 파일 경로면 본문을 읽고, 1500자 이상이면 핵심 단락만 추려 평가 컨텍스트로 만든다.
2. 패널 jsonl에서 `size`만큼 무작위 추출한다(`random.SystemRandom().sample` 또는 시드 없는 `random.sample`). `seed`가 명시된 경우에만 `random.Random(seed).sample`로 결정적 추출하고, 그렇지 않으면 매 실행마다 다른 표본을 사용한다.
3. 추출된 각 페르소나에 대해 Copilot 서브에이전트(`runSubagent`)를 호출한다.
   - 한 호출당 최대 5명을 묶어 토큰을 아낀다.
   - 페르소나마다 다음 4 항목을 200자 이내로 요청:
     1. **첫인상**: 제목/요지를 본 직후의 반응
     2. **영향**: 본인의 일상·일자리·가족·지역에 미칠 구체적 효과
     3. **우려/지지**: 가장 걸리는 점 또는 강하게 동의하는 점
     4. **추가로 알고 싶은 것**: 결정 전에 확인이 필요한 사실
   - 답변 톤은 페르소나의 학력·직업·연령에 자연스럽게 맞춘다(과장된 사투리·차별 표현 금지).
4. 응답을 모아 종합 리뷰를 작성한다.
   - 지지 / 중립 / 반대 분포 (백분율)
   - 연령대·지역·직업·가구 유형 클러스터별 주요 반응을 **최소 6개** 이상 분리해 기술한다.
   - 공통 우려 Top 5, 공통 지지 Top 5
   - 패널에서 누락된 관점(예: 외국인, 청소년, 19세 미만 — 본 데이터셋은 19세 이상 성인만 포함)
   - 정치적 중립 점검(특정 정당·후보 옹호/공격 표현이 응답에 섞였는지)
5. 산출물 양식은 [review-template](./references/review-template.md)을 따른다.
6. 출력 경로:

- 종합: `보관함/결과/<YYYY-MM-DD> <slug>.md`
- raw 응답: `보관함/결과/<YYYY-MM-DD> <slug>.jsonl`

## 금지

- 합성 페르소나 응답을 실명·실존 시민 의견처럼 인용
- 페르소나에 이름·연락처·주소 등 추가 PII 삽입
- 응답을 통계적 대표성으로 단정(샘플은 stratified지만 1차 시뮬레이션이며, 의견은 서브에이전트의 합성 산출)
- 특정 정당·후보·인물 옹호 또는 공격을 페르소나 응답으로 위장
- 데이터셋 footer 의무(출처·라이선스·합성 면책) 누락

## 결과 기준

- `높음`: 분포표, 6개 이상의 클러스터, Top 5 우려/지지, 면책이 모두 포함되며, 응답이 페르소나 속성과 일관됨
- `중간`: 클러스터 6개 미만, Top 5 미충족, 또는 응답 일부가 페르소나 속성과 어긋나거나 면책/출처 일부 누락
- `낮음`: 패널 미존재 또는 중립성 위반 응답이 검출됨 → 재실행

## 출력 footer

모든 산출물 말미에 다음을 포함한다.

```
출처: NVIDIA Nemotron-Personas-Korea (CC BY 4.0)
       https://huggingface.co/datasets/nvidia/Nemotron-Personas-Korea
패널: <panel> · 시드: <seed|random> · 추출 <YYYY-MM-DDTHH:MM:SSZ>
면책: 본 리뷰의 페르소나 응답은 합성 데이터에 기반한 시뮬레이션이며,
       실존 시민의 견해를 대표하지 않습니다.
```
