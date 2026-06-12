// scripts/fetch-nec-data.mjs
/**
 * 선관위 공공데이터 일괄 다운로드 스크립트.
 *
 * Usage: node scripts/fetch-nec-data.mjs
 *
 * Downloads election data from NEC (선관위) open data portal.
 * Saves originals to 보관함/다운로드/nec.go.kr/
 * Normalizes to data/elections/ and src/data/elections/
 */
import { mkdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(fileURLToPath(import.meta.url), '..', '..');
const DOWNLOAD_DIR = join(ROOT, '보관함', '다운로드', 'nec.go.kr');
const OUTPUT_DIR = join(ROOT, 'data', 'elections');
const SRC_OUTPUT_DIR = join(ROOT, 'src', 'data', 'elections');

for (const dir of [DOWNLOAD_DIR, OUTPUT_DIR, SRC_OUTPUT_DIR]) {
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
}

console.log('선관위 데이터 다운로드 스크립트');
console.log('');
console.log('다운로드 경로:', DOWNLOAD_DIR);
console.log('출력 경로 (원본):', OUTPUT_DIR);
console.log('출력 경로 (서빙용):', SRC_OUTPUT_DIR);
console.log('');
console.log('선관위 공공데이터 포털: https://info.nec.go.kr');
console.log('Open API 문서: https://www.nec.go.kr/portal/bbs/list/B0000338.do');
console.log('');
console.log('실제 데이터 다운로드 구현은 korea-gov-scraper 에이전트 또는');
console.log('collect 스킬을 사용하여 진행하세요.');
console.log('');
console.log('다운로드 후 실행: node scripts/normalize-nec-data.mjs <input.csv> <output.csv>');
