import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { parseCsv, filterByRegion, filterByAgeGroup, getParties } from '../../src/js/data-loader.mjs';

const SAMPLE_CSV = `region,sub_region,age_group,party,votes,turnout,total_voters
서울,전체,20대,더불어민주당,1245000,77.1,3200000
서울,전체,20대,국민의힘,980000,77.1,3200000
경기,전체,20대,더불어민주당,1500000,74.8,4100000
경기,전체,50대,국민의힘,1450000,80.2,3500000`;

describe('parseCsv', () => {
  it('parses CSV string into array of objects', () => {
    const rows = parseCsv(SAMPLE_CSV);
    assert.equal(rows.length, 4);
    assert.equal(rows[0].region, '서울');
    assert.equal(rows[0].votes, 1245000);
    assert.equal(rows[0].turnout, 77.1);
  });
});

describe('filterByRegion', () => {
  it('filters rows by region name', () => {
    const rows = parseCsv(SAMPLE_CSV);
    const seoul = filterByRegion(rows, '서울');
    assert.equal(seoul.length, 2);
    assert.ok(seoul.every(r => r.region === '서울'));
  });

  it('returns all rows when region is "전국"', () => {
    const rows = parseCsv(SAMPLE_CSV);
    const all = filterByRegion(rows, '전국');
    assert.equal(all.length, 4);
  });
});

describe('filterByAgeGroup', () => {
  it('filters rows by age group', () => {
    const rows = parseCsv(SAMPLE_CSV);
    const twenties = filterByAgeGroup(rows, '20대');
    assert.equal(twenties.length, 3);
  });

  it('returns all rows when age group is "전체"', () => {
    const rows = parseCsv(SAMPLE_CSV);
    const all = filterByAgeGroup(rows, '전체');
    assert.equal(all.length, 4);
  });
});

describe('getParties', () => {
  it('extracts unique party names', () => {
    const rows = parseCsv(SAMPLE_CSV);
    const parties = getParties(rows);
    assert.deepEqual(parties.sort(), ['국민의힘', '더불어민주당']);
  });
});
