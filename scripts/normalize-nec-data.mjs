// scripts/normalize-nec-data.mjs
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const HEADER_MAP = {
  '시도명': 'region',
  '구시군명': 'sub_region',
  '연령대': 'age_group',
  '정당': 'party',
  '득표수': 'votes',
  '투표율': 'turnout',
  '선거인수': 'total_voters',
};

const NUMERIC_COLS = new Set(['votes', 'turnout', 'total_voters']);

export function normalizeHeaders(headers) {
  return headers.map(h => HEADER_MAP[h] || h);
}

export function normalizeRow(row) {
  const result = {};
  for (const [key, val] of Object.entries(row)) {
    result[key] = NUMERIC_COLS.has(key) ? Number(val) : val;
  }
  return result;
}

export function normalizeFile(inputPath, outputPath) {
  const content = readFileSync(inputPath, 'utf-8');
  const lines = content.trim().split('\n');
  const rawHeaders = lines[0].split(',').map(h => h.trim());
  const headers = normalizeHeaders(rawHeaders);

  const rows = lines.slice(1).map(line => {
    const values = line.split(',').map(v => v.trim());
    const row = {};
    headers.forEach((h, i) => { row[h] = values[i]; });
    return normalizeRow(row);
  });

  const dir = join(outputPath, '..');
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });

  const outputLines = [headers.join(',')];
  rows.forEach(row => {
    outputLines.push(headers.map(h => String(row[h] ?? '')).join(','));
  });
  writeFileSync(outputPath, outputLines.join('\n'), 'utf-8');
  return rows.length;
}
