---
name: collect-weekly-events
description: '지자체 주간행사계획(분당구 등)을 주차 단위로 수집·파싱해 월 Markdown 문서에 병합한다. Use when: 지자체 주간행사 수집, 주간행사계획 문서화, 주차별 행사 파싱, 월 단위 병합, PII 마스킹, 분당구 board_event1 스크레이핑.'
argument-hint: '기간(YYYY-MM-DD~MM-DD) [지역]'
tools: [vscode, execute, read, agent, edit, search, web, browser, 'playwright/*', todo]
---

# collect-weekly-events

`location.txt` 기준 지자체 주간행사계획을 **주차(월~일) 단위**로 수집하고 월 문서에 자동 병합한다. 목록-상세 불일치 0건이 완료 기준이다.

## 입력

| 항목 | 내용 |
|---|---|
| 기간(필수) | 주차 단위. 예) `2026-06-08~2026-06-14`, 복수: `2026-05-25~2026-05-31, 2026-06-01~2026-06-07` |
| 지역 | 기본값 `location.txt` 1행 |
| 상세 수록 | `full`(본문 포함) / `sample`(요약+링크) |

## 지역 일반화 규칙

`location.txt` 1행에서 시/군/구 추출 → 분당구이면 아래 소스 사용, 그 외는 해당 지자체 게시판 URL 먼저 확정.

**분당구 소스**
- 1차: `https://www.bundang-gu.go.kr:10009/sub/content.asp?cIdx=329&fboard=board_event1`
- 2차(보완): `https://www.bundang-gu.go.kr:10009/sub/content.asp?cIdx=219&fboard=board_culture`

## 수집 절차

### 1. 사전 점검

- `robots.txt` 확인
- 입력 기간을 주차 키(`YYYY-MM-DD~MM-DD`)로 정규화
- 목표 주차 수 계산 (월요일 시작 기준)

### 2. 목록 수집

- 게시판 목록에서 **요청 주차와 정확히 일치하는** 게시글 추출
- 필수 필드: `num`, 기간, 게시일, `f_idx`, `filename_re`, 상세 URL

### 3. 원문/뷰어 수집

- 상세 페이지에서 `download`/`preview` 링크 확보
- `d_view.asp` -> `doc.html` -> `iframe(view.xhtml)` 순서로 본문 확보

### 4. 테이블 파싱

- 컬럼: 일시, 행사명, 대상, 장소, 주관, 비고
- 배포본: 비고 컬럼의 담당자 실명/개인 내선번호만 제거 또는 `〔담당자〕` 마스킹
- 예외: 구청 산하 부서/관리과 대표 연락처는 행정조직 정보이므로 마스킹하지 않음

### 5. 결과물 생성

- 목록 테이블 + 주차별 상세 섹션 + 보완 소스(행사/강좌) 섹션 생성
- 월(`YYYY-MM`) 문서에 `num` 기준 upsert(없으면 추가, 있으면 교체); 병합 후 목록-상세 집합 일치 유지

### 6. Validation (필수)

- `V0` 입력 주차 키 형식/경계 유효성 pass
- `V1` 목록 건수 = 목표 주차 수
- `V2` 상세 섹션 수 = 목록 건수
- `V3` 상세 섹션의 `num` 집합 = 목록 `num` 집합
- `V4` 요청 주차 키 집합 = 수집 주차 키 집합
- `V5` 배포본에 담당자 실명/개인 내선번호 미노출
- `V6` 배포본에서 부서/관리과 대표 연락처는 비마스킹 유지
- `V7` 월 문서 병합 후 중복 `num`/중복 주차 키 없음

검증 실패 시: `status: incomplete` + `missing_nums` + `failed_checks` 명시, 완료 보고 금지.

## 결과물

**Markdown 월 문서** (`보관함/결과/YYYY-MM <지역> 주간행사계획.md`)
- 없으면 신규 생성, 있으면 `num` 기준 upsert. 검증은 병합 후 문서 기준.
- 예) 기존 4주차만 존재 → 2·3주차 요청 → 같은 월 문서에 2·3·4주차 공존.

**원문 보관**: `보관함/다운로드/<host>/board_event1/{f_idx}_{filename}.hwp` + `.meta.json`

## 출력 스켈레톤

```markdown
<!--
source_type: weekly_event_plan
region: <location.txt에서 파생>
board_url: <1차 소스 URL>
collected_at: YYYY-MM-DDTHH:MM:SS+09:00
pii_note: 비고 컬럼 마스킹/제거
status: complete
-->

# <지역> 주간행사계획 (<기간>)

## 게시된 주간행사계획 목록
| 게시번호 | 기간 | 게시일 | 원문 HWP | 뷰어 |
|---|---|---|---|---|

## 주간행사 상세 — YYYY-MM-DD ~ MM-DD (num=...)
...

## 검증 결과
- V0: pass
- V1: pass
- V2: pass
- V3: pass
- V4: pass
- V5: pass
- V6: pass
- V7: pass
```

---

## 알려진 리스크

1. `filename_re` 누락 시 `d_view.asp` 실패
2. iframe 렌더링 지연(2~4초)으로 파싱 실패 가능
3. 지역 전환 시 URL 패턴 상이(지역별 게시판 구조 재확인 필요)
