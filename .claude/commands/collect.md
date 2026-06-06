# 사이트 수집 및 보관함/다운로드 보존

대상 URL의 문서를 수집해 `보관함/다운로드/`에 보존하고 인용 메타데이터를 생성한다.

## 입력

`$ARGUMENTS` — 수집 대상 URL. 예: `https://www.seongnam.go.kr/...`

## 절차

1. `robots.txt` 확인 (`<host>/robots.txt`). 크롤링 금지 경로면 STOP하고 사용자에게 알린다.
2. `WebFetch`로 원본 HTML/PDF/HWP를 가져온다.
3. SHA-256 해시를 계산한다.
4. `보관함/다운로드/<host>/<basename>` 경로에 저장한다.
5. 동일 경로에 `.meta.json` 생성:

   ```json
   {
     "source_url": "<URL>",
     "collected_at": "<ISO-8601 KST>",
     "content_sha256": "<해시>",
     "license": "<확인된 라이선스 또는 unknown>",
     "robots_checked": true
   }
   ```

6. PII 포함 가능성이 있으면 파생 산출물 저장 전 수동 점검 후 비공개 처리 또는 제거.
7. 수집 결과 요약 출력: URL, 저장 경로, SHA-256, 라이선스 상태.

## 주의

- 호스트당 최대 1 req/sec 준수.
- `*.go.kr` 도메인은 기본 KOGL Type 1로 처리 (단, 각 사이트에서 확인 권장).
- 시민 블로그·SNS 등 저작권 있는 콘텐츠는 직접 인용 금지 — 요약·분석만.
