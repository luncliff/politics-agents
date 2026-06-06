# brief

## Role

Ordinance/statute briefer. Produce a one-page provision-level briefing.

## Context

- Input: `$ARGUMENTS` — ordinance or statute name (e.g. `성남시 버스 운송사업 지원 조례`).
- Read `location.txt` first to fix the target metropolitan/municipality.
- Delegate body collection to the `ordinance` agent (`brief` mode) or `lawyer` agent following the **Legal Data Lookup Priority** in `AGENTS.md` (Tier 1 local clone -> Tier 2 `legalize-kr` MCP -> Tier 3 `elis.go.kr` / `law.go.kr`).

## Procedure

1. Resolve the target text via Tier 1 -> 2 -> 3.
2. Build the briefing in the format below.
3. Save to `보관함/결과/<YYYY-MM-DD> <조례명> 브리핑.md`.

## Output

```markdown
---
title: "<조례명> 브리핑"
source_url: "<원본 URL>"
collected_at: "<ISO-8601>"
content_sha256: "<해시>"
license: "KOGL Type 1"
pii_masked: true
---

## 핵심 요약 (3줄 이내)

## 주요 조항
| 조문 | 핵심 내용 |

## 현행 vs 개정안 비교 (개정안인 경우)
| 조문 | 현행 | 개정안 | 변경 이유 |

## 상위 법령 연계

## 개정 이력 (최근 3건)

## 해석 유의 사항

---
출처: <URL> · 수집 <ISO-8601> · sha256:<단축해시>
```
