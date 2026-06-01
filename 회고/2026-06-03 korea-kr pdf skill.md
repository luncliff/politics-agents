---
date: 2026-06-03
slug: korea-kr-pdf-skill
duration_min: 35
---

## 시도한 것
- `korea.kr` 전자책/부처 간행물 페이지에서 PDF 링크 구조를 추적했다.
- `pdf_enc.jsp` 래퍼가 HTML만 돌려주는 경우를 확인하고, `customLayout_k.jsp`와 `viewer.jsp?reqType=docData`까지 따라갔다.
- 같은 절차를 재사용할 수 있도록 `.agents/skills/download-korea-kr-pdf/SKILL.md`를 만들었다.

## 성공한 것
- `viewer.jsp`의 `docData` 응답이 실제 PDF 바이트임을 확인했다.
- `보관함/다운로드/korea.kr/` 아래에 PDF 2건과 메타 JSON을 저장했다.
- 새 skill의 frontmatter와 본문 절차를 정리했다.

## 막힌 것 / 다음에 해결
- `pdf_enc.jsp`를 그대로 저장하면 HTML 래퍼가 남는다.
- 이후 작업에서는 브라우저 네트워크나 뷰어 요청을 먼저 확인하는 절차가 필요하다.

## 새로 알게 된 사이트·포맷·정책
- `gonggam.korea.kr/ezpdf/pdf_enc.jsp` -> `customLayout_k.jsp?encdata=...` -> `viewer.jsp?reqType=docData` 순으로 실제 PDF가 노출된다.
- `docData` 응답은 직접 PDF 본문이며, 파일 헤더는 `%PDF-`로 시작한다.

## 자동화 후보
- skill: `download-korea-kr-pdf`
- task: `korea.kr` PDF 다운로드 검증용 브라우저/터미널 체크

## 출처·PII 점검 결과
- 외부 원문은 `보관함/다운로드/korea.kr/`에 보존했고, 수집 시각과 SHA-256 메타를 함께 기록했다.
- PII는 확인되지 않았다.
