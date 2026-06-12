---
name: scrape-council-schedule
description: >
  동적 로딩(JavaScript 렌더링)을 사용하는 대한민국 지방의회·광역의회 누리집에서
  browser 또는 Playwright 도구로 연간의사일정·회기일정·위원회 일정을 수집하고
  Markdown 표로 정리한다.
  Use when: 성남시의회·경기도의회 등 지방의회 공식 페이지에서 회기번호·집회일·종료일·
  주요의제를 추출해야 할 때; 연도 선택형 드롭다운이나 AJAX 렌더링으로 직접 크롤링이
  불가능할 때; 연간의사일정 문서를 최신 공식 데이터로 갱신할 때.
argument-hint: "<의회명> [연도|전체] [연간의사일정|위원회|본회의]"
tools: [vscode, execute, read, agent, edit, search, web, browser, 'playwright/*', todo]
---

# scrape-council-schedule

대한민국 지방의회·광역의회의 공식 연간의사일정 페이지는 대부분 JavaScript로 동적 렌더링된다.
이 스킬은 Playwright(browser) 도구를 사용해 DOM을 직접 탐색하고, 연도별 회기 표를 추출해 Markdown으로 변환한다.

## 언제 쓰는가

- 지방의회 공식 연간의사일정 페이지가 연도 선택 드롭다운이나 AJAX 방식을 사용할 때
- `fetch_webpage` 등 정적 도구로는 표 내용을 읽을 수 없을 때
- 회기번호·집회일·종료일·주요의제를 연도 단위로 추출해야 할 때
- 기존 문서의 `❓` 미확인 일정을 공식 페이지 데이터로 대체할 때

## 대상 의회 식별

- 작업 시작 시 저장소 루트 [`location.txt`](../../../location.txt)를 먼저 읽어 기준 행정구역을 확정한다.
- 사용자가 채팅에서 다른 의회를 명시하면 그 지시가 우선한다.

## 주요 참조 URL

| 의회 | 연간의사일정 URL |
|---|---|
| 성남시의회 | `https://www.sncouncil.go.kr/kr/news/cmsYear.do` |
| 경기도의회 | `https://www.ggc.go.kr/site/main/schedule/year/list` |
| 경기도의회 KMS (회의록) | `https://kms.ggc.go.kr/svc/cms/mnts/MntsTreeSesnList.do` |

> 타 지방의회는 공식 누리집 상단 메뉴 → 의정활동·의사일정·연간회기일정 경로로 URL을 찾는다.

## 워크플로우

### 1단계: 페이지 구조 파악 (스냅샷)

```js
// 페이지 구조를 빠르게 확인
await page.goto('https://www.sncouncil.go.kr/kr/news/cmsYear.do');
const snapshot = await page.accessibility.snapshot();
```

- 드롭다운(combobox), 표(table), 연도 선택 UI가 있는지 확인한다.
- 연도별 표가 DOM에 미리 렌더링되어 있는지, 또는 선택 이후 동적으로 교체되는지 파악한다.

### 2단계: 연도 매핑 확인

성남시의회처럼 DOM에 모든 연도 표가 처음부터 존재하는 경우 인덱스로 접근한다.

```js
// 성남시의회: 2026→0, 2025→1, 2024→2, 2023→3, 2022→4
const mapping = { 2026: 0, 2025: 1, 2024: 2, 2023: 3, 2022: 4 };
const tables = await page.locator('table').all();
```

경기도의회처럼 선택 이후 교체되는 경우 드롭다운을 제어한다.

```js
await page.selectOption('select', '2024');
await page.waitForLoadState('networkidle');
const table = await page.locator('table').first();
```

### 3단계: 표 내용 추출

```js
// 특정 연도 표 텍스트 추출 (인덱스 방식)
const text = await page.locator('table').nth(mapping[year]).innerText();
```

또는 행(row) 단위로 추출해 구조화한다.

```js
const rows = await page.locator('table tbody tr').all();
const data = [];
for (const row of rows) {
  const cells = await row.locator('td').allInnerTexts();
  data.push(cells);
}
```

### 4단계: Markdown 변환

추출한 데이터를 아래 형태로 정리한다.

| 회기 | 집회일~종료일 | 회의일수 | 주요의제 | 비고 |
|---|---|---|---|---|
| 제273회 임시회 | 07.08~07.26 | 19일 | 의장·부의장 선거, 상임위원회 구성 | 원구성 |

- 법률·조례로 날짜가 고정된 항목에는 `📌`를 붙인다.
- 공식 일정이 아직 확정되지 않은 항목에는 `❓`를 붙인다.
- 공식 페이지에서 "구성 이후 결정 예정"이라는 문구가 있으면 그대로 인용한다.

### 5단계: 기존 문서 비교 및 반영

- 대상 문서에서 `❓` 표시가 있는 셀을 확인한다.
- 공식 페이지에서 확인된 회기번호·날짜로 교체한다.
- 아직 공식 확인이 되지 않은 셀은 `❓`를 유지한다.

### 6단계: 출처 메타 기록

```
[성남시의회 연간의사일정](https://www.sncouncil.go.kr/kr/news/cmsYear.do) — 2022~2026 연도별 표 직접 확인 · 수집 YYYY-MM-DD
```

## 실패 대응

| 현상 | 원인 | 대응 |
|---|---|---|
| 표가 비어 있음 | JS 렌더링 지연 | `page.waitForLoadState('networkidle')` 후 재시도 |
| `require is not defined` | Node 환경 아님 | `import` 또는 Playwright API 사용 |
| 드롭다운 변경 후 표가 갱신 안 됨 | 표가 DOM에 이미 전부 존재 | 인덱스 방식으로 전환 |
| 표 인덱스가 맞지 않음 | 연도 추가/삭제로 순서 변화 | 드롭다운 옵션 순서를 먼저 확인 후 매핑 재산출 |
| selector 오류 | h4, section 등 구조 변경 | 스냅샷에서 표 컨테이너의 실제 태그와 ref를 먼저 확인 |

## 일반화 지침 (타 의회 적용 시)

1. 공식 누리집 → 의정활동 또는 의회소식 → 연간의사일정(연간회기일정) 경로 확인.
2. Playwright 스냅샷으로 드롭다운 selector와 표 구조 파악.
3. `mapping` 딕셔너리를 해당 연도-인덱스 또는 값-선택 방식으로 재구성.
4. 표 컬럼 순서(회기, 기간, 일수, 주요의제, 비고)가 의회마다 다를 수 있으니 헤더 행을 먼저 읽는다.
5. 결과 Markdown 표 형식은 이 스킬의 4단계 템플릿을 동일하게 사용한다.

## 출처·PII 원칙

- 수집한 일정 데이터는 모두 공식 누리집 출처 URL과 수집일(ISO-8601 KST)을 붙인다.
- 표에서 의원 이름 등 PII가 포함될 경우 산출물 공개 전 수동 검토 후 제거 또는 마스킹한다.
- 원본 스냅샷 파일(`.playwright-mcp/*.yml` 등)은 커밋하지 않는다.
