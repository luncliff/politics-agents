---
name: download-korea-kr-pdf
description: "PDF를 내려받는다. korea.kr 웹페이지의 정책브리핑 전자책, 부처 간행물, pdf_enc.jsp 래퍼, customLayout_k.jsp 뷰어, viewer.jsp docData 응답을 따라 실제 PDF 바이트를 저장할 때 사용한다. Use when: korea.kr 페이지의 PDF 링크가 HTML 래퍼로 열리거나, 다운로드 URL만으로는 실제 파일이 보이지 않을 때."
argument-hint: "<korea.kr 페이지 URL> [대상 PDF 제목]"
---

# download-korea-kr-pdf

korea.kr 계열 페이지에서 실제 PDF를 찾아 보존하고, 원본 출처와 해시를 함께 기록한다.

## 언제 쓰는가

- `www.korea.kr` 전자책/정책자료 페이지에서 PDF를 받아야 할 때
- `gonggam.korea.kr/ezpdf/pdf_enc.jsp` 링크가 HTML 래퍼로만 열릴 때
- 브라우저에서 열리는 뷰어가 실제 PDF 본문을 숨기고 있을 때
- 정책브리핑 전자책, 부처 간행물, 첨부 PDF를 원본 그대로 보존해야 할 때

## 입력

- `korea.kr` 페이지 URL 또는 해당 전자책 목록 페이지 URL
- 필요하면 대상 제목, 호수, 부처명, 발행일 같은 식별자

## 원칙

- 최종 산출물은 PDF여야 한다. HTML 래퍼나 뷰어 껍데기를 최종 파일로 저장하지 않는다.
- 원문은 먼저 `보관함/다운로드/korea.kr/` 아래에 저장한다.
- 메타데이터는 원본 파일 옆의 `.meta.json`에 남긴다.
- 한 페이지에 여러 PDF가 있으면 제목과 보이는 레이블을 기준으로 하나씩 처리한다.

## 워크플로우

### 1. 대상 링크 찾기

- 페이지에서 PDF 링크를 먼저 확인한다.
- 링크가 직접 `.pdf`면 우선 그 주소를 사용한다.
- 링크가 `pdf_enc.jsp`면 실제 본문이 한 단계 더 숨어 있다고 가정한다.

### 2. 래퍼와 뷰어를 추적하기

- `pdf_enc.jsp`를 열었을 때 작은 HTML만 내려오면 `customLayout_k.jsp?encdata=...`로 리다이렉트되는지 확인한다.
- 뷰어 페이지에서 네트워크 요청 또는 페이지 소스를 확인해 `viewer.jsp?optNoUi=true&optLang=ko&contentId=...&reqType=docData` 요청을 찾는다.
- `reqType=docData` 응답이 실제 PDF 바이트다.
- 응답 헤더가 없어도 파일 시작 바이트가 `%PDF-`인지 확인한다.

### 3. 저장하기

- 파일명은 제목을 기준으로 정리된 안전한 이름을 쓴다.
- 저장 예시:
  - `보관함/다운로드/korea.kr/국무조정실-국민주권정부-38대-대표-성과.pdf`
  - `보관함/다운로드/korea.kr/국무조정실-국민주권정부-123대-국정과제-추진실적.pdf`
- 같은 이름의 `.meta.json`을 생성한다.

### 4. 메타데이터 기록하기

최소 필드는 아래와 같이 둔다.

```json
{
  "source_page_url": "...",
  "source_url": "...",
  "collected_at": "2026-06-03T22:38:11+09:00",
  "content_sha256": "...",
  "saved_file": "..."
}
```

- `source_page_url`은 사용자가 본 목록/기사 페이지다.
- `source_url`은 실제 PDF 또는 docData 응답으로 이어지는 최종 URL이다.
- `collected_at`은 KST ISO-8601 형식으로 남긴다.
- `content_sha256`은 저장한 PDF 본문 기준 해시다.
- `saved_file`은 실제 저장 경로다.

### 5. 완료 확인

- 파일 헤더가 `%PDF-`인지 확인한다.
- 파일 크기가 비정상적으로 작지 않은지 확인한다.
- `.meta.json`이 같은 이름으로 함께 존재하는지 확인한다.
- 래퍼 HTML을 저장했다면 폐기하고 다시 받는다.

## 실패 분기

- `pdf_enc.jsp`를 저장했더니 HTML만 남는다: 브라우저로 열어서 `customLayout_k.jsp`와 `viewer.jsp`를 따라간다.
- `viewer.jsp`가 보이지만 파일이 깨진다: `docData` 응답의 실제 바이트를 다시 저장한다.
- 제목이 중복된다: 발행일, 호수, 부처명을 덧붙여 파일명을 구분한다.

## 완료 체크리스트

- [ ] 실제 파일이 PDF 헤더를 가진다
- [ ] 원본이 `보관함/다운로드/korea.kr/`에 저장됐다
- [ ] `.meta.json`에 source URL, 수집시각, SHA-256이 있다
- [ ] HTML 래퍼를 최종 산출물로 남기지 않았다
