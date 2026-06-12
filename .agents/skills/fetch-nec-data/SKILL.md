---
name: fetch-nec-data
description: 선관위 API/포털에서 선거 데이터 일괄 다운로드 + 정규화
---

# fetch-nec-data

선관위(중앙선거관리위원회) 공공데이터를 일괄 다운로드하고 정규화합니다.

## 사용법

1. `node scripts/fetch-nec-data.mjs` — 선관위 포털 안내 출력 및 디렉토리 준비
2. 데이터 수동 다운로드 또는 `korea-gov-scraper` 에이전트 활용
3. `node scripts/normalize-nec-data.mjs <input> <output>` — 원본 CSV를 정규 구조로 변환

## 출력 경로

- 원본 보존: `보관함/다운로드/nec.go.kr/`
- 정규화 데이터: `data/elections/<type>/<year>.csv`
- 서빙용 데이터: `src/data/elections/<type>/<year>.csv`

## 정규화 컬럼

`region, sub_region, age_group, party, votes, turnout, total_voters`

## 주의사항

- robots.txt 및 rate limit (1 req/sec) 준수
- 원본 파일은 수정/삭제 금지 (`보관함/다운로드/` 규칙)
- `.meta.json` 에 수집 시간·SHA-256 기록 필수 (`collect` 스킬 활용)
