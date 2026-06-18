---
name: collect-weekly-events
description: '지자체 주간행사계획(분당구 등)을 주차 단위로 수집·파싱해 월 Markdown 문서에 병합한다. Node.js 배치 실행을 우선으로 사용한다.'
argument-hint: '--weeks YYYY-MM-DD~YYYY-MM-DD[, ...] [--dry-run] [--migrate move|copy|skip]'
tools: [vscode, execute, read, agent, edit, search, web, browser, 'playwright/*', todo]
---

# collect-weekly-events

`location.txt` 기준 지자체 주간행사계획을 **Node.js 배치**로 수집하고 월 문서에 자동 병합한다. 기본 실행 경로는 아래 CLI이다.

```bash
npm run download:bundang-gu-weekly-events -- --weeks 2026-06-01~2026-06-07,2026-06-08~2026-06-14
```

## 입력

| 항목 | 내용 |
|---|---|
| `--weeks`(필수) | 주차 키 CSV. 예) `2026-06-08~2026-06-14,2026-06-15~2026-06-21` |
| `--dry-run` | 파일 쓰기 없이 수집/검증만 수행 |
| `--migrate` | `move`(기본) / `copy` / `skip`. 기존 `board_event1` 하위 파일 처리 정책 |
| 지역 | 기본값 `location.txt` 1행 (분당구 포함 필수) |

## 지역 일반화 규칙

`location.txt` 1행에서 시/군/구를 추출한다. 현재 구현은 분당구 전용이며, 분당구가 아니면 실행을 중단한다.

**분당구 소스**
- 1차: `https://www.bundang-gu.go.kr:10009/sub/content.asp?cIdx=329&fboard=board_event1`
- 2차(보완): `https://www.bundang-gu.go.kr:10009/sub/content.asp?cIdx=219&fboard=board_culture`

## 수집 절차

### 1. 사전 점검

- `robots.txt` 확인
- 입력 주차 키를 `YYYY-MM-DD~YYYY-MM-DD`로 정규화
- migration 모드에 따라 기존 `보관함/다운로드/www.bundang-gu.go.kr/board_event1/` 파일을 host 직하위로 이동 또는 복사

### 2. 목록 수집

- 게시판 목록에서 **요청 주차와 정확히 일치하는** 게시글 추출
- 필수 필드: `num`, 기간, 게시일, 상세 URL

### 3. 원문/뷰어 수집 및 다운로드 보관

- 상세 페이지에서 `download`/`preview` 링크 확보
- `d_view.asp` -> `doc.html` -> `iframe(view.xhtml)` 순서로 본문 확보
- **HWP 원본 저장**: `download.asp?f_idx=<f_idx>` 로 HWP 파일을 내려받아  
  `보관함/다운로드/<host>/<board>_<f_idx>_<filename>.hwp` 에 저장  
  (이미 존재하면 덮어쓰지 않고 건너뜀)
- **메타데이터 저장**: 같은 디렉터리에 `<f_idx>_<filename>.hwp.meta.json` 생성

  ```json
  {
    "board": "board_event1",
    "num": "<num>",
    "f_idx": "<f_idx>",
    "filename_re": "<filename_re>",
    "week_key": "YYYY-MM-DD~YYYY-MM-DD",
    "source_page_url": "<상세 페이지 URL>",
    "source_url": "<download.asp URL>",
    "download_url": "<download.asp URL>",
    "preview_url": "<d_view.asp URL>",
    "extraction_method": "preview-view.xhtml",
    "row_count": 123,
    "collected_at": "YYYY-MM-DDTHH:MM:SS+09:00"
  }
  ```

### 4. 테이블 파싱

- 컬럼: 일시, 행사명, 대상, 장소, 주관, 비고
- 배포본: 비고 컬럼의 담당자 실명/개인 내선번호만 제거 또는 `〔담당자〕` 마스킹
- 예외: 구청 산하 부서/관리과 대표 연락처는 행정조직 정보이므로 마스킹하지 않음

### 5. 결과물 생성

- 목록 테이블 + 주차별 상세 섹션 생성
- 월(`YYYY-MM`) 문서를 `num` 기준 upsert
- 기존 월 문서가 있으면 `.bak` 백업 생성 후 갱신

### 6. Validation (필수)

- `V0` 입력 주차 키 형식/경계 유효성 pass
- `V1` 목록 건수 = 목표 주차 수
- `V2` 상세 섹션 수 = 목록 건수
- `V3` 상세 섹션의 `num` 집합 = 목록 `num` 집합
- `V4` 요청 주차 키 집합 = 수집 주차 키 집합
- `V5` 배포본에 담당자 실명/개인 내선번호 미노출
- `V6` 배포본에서 부서/관리과 대표 연락처는 비마스킹 유지
- `V7` 월 문서 병합 후 중복 `num`/중복 주차 키 없음
- `V8` 수집된 모든 `num`에 대해 `보관함/다운로드/<host>/<board>_<f_idx>_*.hwp` 파일과 `.meta.json` 쌍이 존재하고 `board_event1/` 하위에 신규 저장이 없음

검증 실패 시: `status: incomplete` + `missing_nums` + `failed_checks` 명시, 완료 보고 금지.

## 결과물

**Markdown 월 문서** (`보관함/결과/YYYY-MM <지역> 주간행사계획.md`)
- 없으면 신규 생성, 있으면 `num` 기준 upsert. 검증은 병합 후 문서 기준.
- 예) 기존 4주차만 존재 → 2·3주차 요청 → 같은 월 문서에 2·3·4주차 공존.
- **최종 출력물은 self-contained 이어야 한다**: HTML 주석 프런트매터와 본문 표만 포함. `## 검증 결과` 섹션은 최종 출력물에 포함하지 않는다.

**원문 보관** (절차 3단계에서 즉시 저장):
- HWP: `보관함/다운로드/<host>/<board>_<f_idx>_<filename>.hwp`
- 메타: `보관함/다운로드/<host>/<board>_<f_idx>_<filename>.hwp.meta.json`
- 분당구 host 예시: `www.bundang-gu.go.kr`
- 파일이 이미 있으면 건너뜀(immutable 원칙); `.meta.json`은 `collected_at`만 최신값으로 갱신

## 출력 스켈레톤

> `## 검증 결과` 섹션은 **내부 검증 전용**이며 최종 출력물에 포함하지 않는다.
> 검증 실패 시에만 에이전트가 채팅으로 오류를 보고하고, 완료 후 출력 파일에는 흔적을 남기지 않는다.

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
```

---

## 알려진 리스크

1. `filename_re` 누락 시 `d_view.asp` 실패
2. iframe 렌더링 지연(2~4초)으로 파싱 실패 가능
3. 지역 전환 시 URL 패턴 상이(지역별 게시판 구조 재확인 필요)
4. migration 중 파일명 충돌 시 기존 파일 우선으로 건너뜀
