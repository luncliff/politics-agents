import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeRow, normalizeHeaders } from '../../scripts/normalize-nec-data.mjs';

describe('normalizeHeaders', () => {
  it('maps Korean column names to standard names', () => {
    const raw = ['시도명', '구시군명', '연령대', '정당', '득표수', '투표율', '선거인수'];
    const mapped = normalizeHeaders(raw);
    assert.deepEqual(mapped, ['region', 'sub_region', 'age_group', 'party', 'votes', 'turnout', 'total_voters']);
  });

  it('passes through already-standard names', () => {
    const raw = ['region', 'sub_region', 'age_group', 'party', 'votes', 'turnout', 'total_voters'];
    assert.deepEqual(normalizeHeaders(raw), raw);
  });
});

describe('normalizeRow', () => {
  it('converts numeric strings to numbers', () => {
    const row = { region: '서울', sub_region: '전체', age_group: '20대', party: '더불어민주당', votes: '1245000', turnout: '77.1', total_voters: '3200000' };
    const norm = normalizeRow(row);
    assert.equal(norm.votes, 1245000);
    assert.equal(norm.turnout, 77.1);
    assert.equal(norm.total_voters, 3200000);
    assert.equal(norm.region, '서울');
  });
});
