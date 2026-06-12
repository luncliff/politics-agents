---
name: election-viz
description: 선거 시각화 대시보드 로컬 프리뷰 기동 및 테스트
---

# election-viz

선거 시각화 대시보드를 로컬에서 서빙하고 검증합니다.

## 사용법

```bash
# 대시보드 서빙 (http://localhost:8080)
npm run serve

# 단위 테스트
node --test tests/unit/

# E2E 테스트 (Playwright)
npx playwright test --config tests/e2e/playwright.config.mjs --workers=1

# 전체 테스트
npm run test:unit && npx playwright test --config tests/e2e/playwright.config.mjs --workers=1
```

## 전제조건

- `src/data/elections/meta.json` 존재
- 최소 1개 선거 CSV 파일 존재 (`src/data/elections/<type>/<year>.csv`)
- `npm install` 완료 + `npx playwright install chromium` 완료

## 데이터 추가 방법

1. `fetch-nec-data` 스킬로 선관위 데이터 준비
2. `src/data/elections/meta.json`에 선거 항목 추가
3. `src/data/elections/<type>/<year>.csv` 위치에 정규화된 CSV 배치

## 차트 구성

| 컴포넌트 | 파일 | 역할 |
|---------|------|------|
| Timeline | `src/js/timeline.mjs` | 선거 선택 타임라인 |
| Filter | `src/js/filters.mjs` | 지역·연령 필터 |
| Cohort Chart | `src/js/cohort-chart.mjs` | 코호트 추세선 (D3) |
| Detail Panel | `src/js/detail-panel.mjs` | 클릭 시 히트맵 디테일 |
| Event Markers | `src/js/event-markers.mjs` | 사용자 입력 사건 마커 |
| Chart Explainer | `src/js/chart-explainer.mjs` | 차트 유형 설명 |
