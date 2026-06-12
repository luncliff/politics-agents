// src/js/data-loader.mjs

export function parseCsv(csvText) {
  const lines = csvText.trim().split('\n');
  const headers = lines[0].split(',');
  const numericCols = new Set(['votes', 'turnout', 'total_voters']);

  return lines.slice(1).map(line => {
    const values = line.split(',');
    const row = {};
    headers.forEach((h, i) => {
      const key = h.trim();
      const val = values[i].trim();
      row[key] = numericCols.has(key) ? Number(val) : val;
    });
    return row;
  });
}

export function filterByRegion(rows, region) {
  if (region === '전국') return rows;
  return rows.filter(r => r.region === region);
}

export function filterByAgeGroup(rows, ageGroup) {
  if (ageGroup === '전체') return rows;
  return rows.filter(r => r.age_group === ageGroup);
}

export function getParties(rows) {
  return [...new Set(rows.map(r => r.party))];
}

export async function loadElectionData(basePath, electionId) {
  const metaResp = await fetch(`${basePath}/meta.json`);
  const meta = await metaResp.json();
  const election = meta.elections.find(e => e.id === electionId);
  if (!election) throw new Error(`Election not found: ${electionId}`);

  const csvPath = `${basePath}/${election.type}/${election.date.slice(0, 4)}.csv`;
  const csvResp = await fetch(csvPath);
  const csvText = await csvResp.text();
  return { election, rows: parseCsv(csvText) };
}
