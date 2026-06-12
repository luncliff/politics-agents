# Election Visualization Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build an interactive single-page HTML dashboard visualizing Korean election data (2017–2025) with D3.js cohort trend lines, timeline navigation, region filters, and user-driven event markers.

**Architecture:** Static data pipeline (download → normalize → local CSV) feeding a single HTML+D3.js page. No build tools or bundler — vanilla JS modules loaded via `<script type="module">`. Playwright for E2E testing of interactions, Node.js test runner for data processing unit tests.

**Tech Stack:** D3.js v7, HTML5, CSS3, Node.js 24 (scripts + tests), Playwright (E2E), `node --test` (unit tests)

---

## File Structure

```
support/election-visualize/           (branch-specific work)
├── data/elections/
│   ├── meta.json                     # Election registry
│   ├── presidential/2017.csv         # Normalized election data
│   ├── presidential/2022.csv
│   ├── presidential/2025.csv
│   ├── assembly/2020.csv
│   ├── assembly/2024.csv
│   ├── local/2018.csv
│   ├── local/2022.csv
│   └── byelection/2021-seoul-mayor.csv
├── scripts/
│   ├── fetch-nec-data.mjs            # Download from NEC portal
│   └── normalize-nec-data.mjs        # CSV/JSON → normalized CSV
├── src/
│   ├── index.html                    # Single page dashboard
│   ├── styles.css                    # Dashboard styles
│   ├── js/
│   │   ├── main.mjs                  # App entry, wiring
│   │   ├── data-loader.mjs           # Fetch & parse local CSVs
│   │   ├── timeline.mjs              # Timeline bar component
│   │   ├── filters.mjs               # Region/age/party filter UI
│   │   ├── cohort-chart.mjs          # Main line chart (D3)
│   │   ├── detail-panel.mjs          # Heatmap + summary on click
│   │   ├── event-markers.mjs         # User-driven event input/display
│   │   └── chart-explainer.mjs       # "About this chart" panel
│   └── lib/
│       └── d3.min.mjs                # D3 v7 ESM bundle (vendored)
├── tests/
│   ├── unit/
│   │   ├── data-loader.test.mjs      # CSV parsing, filtering
│   │   ├── normalize.test.mjs        # Normalization logic
│   │   └── event-markers.test.mjs    # Event CRUD logic
│   └── e2e/
│       ├── playwright.config.mjs     # Playwright config
│       ├── timeline.spec.mjs         # Timeline interaction
│       ├── filters.spec.mjs          # Filter toggling
│       ├── cohort-chart.spec.mjs     # Chart render + click
│       ├── detail-panel.spec.mjs     # Detail panel open/close
│       └── event-markers.spec.mjs    # Add/remove event markers
└── README.md                         # Usage instructions
```

## Testing Strategy

### Unit Tests (node --test)
- **Data loader**: CSV parsing, column extraction, filtering by region/age/party
- **Normalization script**: Raw NEC format → standard columns
- **Event markers logic**: Add/remove/persist events (pure functions)

### E2E Tests (Playwright)
- Serve `src/` via `npx http-server` on localhost
- Test real browser interactions: click timeline → chart updates, click filter → data changes, add event → marker appears
- Assert DOM state: SVG elements exist, correct data attributes, panel visibility

### TDD Flow
Each task follows: write failing test → verify failure → implement → verify pass → commit.

---

## Task 1: Project Scaffold + Test Infrastructure

**Files:**
- Create: `package.json` (update devDependencies)
- Create: `tests/unit/data-loader.test.mjs`
- Create: `tests/e2e/playwright.config.mjs`
- Create: `src/index.html` (minimal shell)

- [ ] **Step 1: Install test dependencies**

```bash
npm install --save-dev @playwright/test playwright
npx playwright install chromium
```

- [ ] **Step 2: Add test scripts to package.json**

Add to `scripts` in `package.json`:
```json
{
  "test:unit": "node --test tests/unit/",
  "test:e2e": "npx playwright test --config tests/e2e/playwright.config.mjs",
  "test": "npm run test:unit && npm run test:e2e",
  "serve": "npx http-server src -p 8080 -c-1 --silent"
}
```

- [ ] **Step 3: Create Playwright config**

```javascript
// tests/e2e/playwright.config.mjs
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: '.',
  timeout: 30000,
  use: {
    baseURL: 'http://localhost:8080',
    headless: true,
  },
  webServer: {
    command: 'npx http-server src -p 8080 -c-1 --silent',
    port: 8080,
    reuseExistingServer: true,
  },
});
```

- [ ] **Step 4: Create minimal HTML shell**

```html
<!-- src/index.html -->
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>선거 시각화 대시보드</title>
  <link rel="stylesheet" href="styles.css">
</head>
<body>
  <header id="app-header">
    <h1>선거 시각화 대시보드</h1>
  </header>
  <main id="app-main">
    <section id="timeline-section"></section>
    <section id="filters-section"></section>
    <section id="chart-section">
      <div id="cohort-chart"></div>
      <aside id="detail-panel" hidden></aside>
    </section>
    <section id="explainer-section" hidden></section>
  </main>
  <script type="module" src="js/main.mjs"></script>
</body>
</html>
```

- [ ] **Step 5: Create minimal CSS**

```css
/* src/styles.css */
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
:root {
  --bg: #0d1117;
  --surface: #161b22;
  --border: #30363d;
  --text: #e6edf3;
  --text-muted: #8b949e;
  --accent: #4fc3f7;
}
body { font-family: -apple-system, BlinkMacSystemFont, sans-serif; background: var(--bg); color: var(--text); }
header { padding: 1rem 2rem; border-bottom: 1px solid var(--border); }
main { max-width: 1400px; margin: 0 auto; padding: 1rem 2rem; }
section { margin-bottom: 1.5rem; }
#chart-section { display: grid; grid-template-columns: 1fr 320px; gap: 1rem; }
#detail-panel[hidden] { display: none; }
#explainer-section[hidden] { display: none; }
```

- [ ] **Step 6: Create placeholder main.mjs**

```javascript
// src/js/main.mjs
console.log('Election visualization dashboard loaded');
```

- [ ] **Step 7: Write smoke E2E test**

```javascript
// tests/e2e/timeline.spec.mjs
import { test, expect } from '@playwright/test';

test('page loads with correct title', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle('선거 시각화 대시보드');
  await expect(page.locator('#app-header h1')).toHaveText('선거 시각화 대시보드');
});

test('main sections exist', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('#timeline-section')).toBeVisible();
  await expect(page.locator('#filters-section')).toBeVisible();
  await expect(page.locator('#cohort-chart')).toBeVisible();
});
```

- [ ] **Step 8: Run E2E test to verify it passes**

Run: `npm run test:e2e`
Expected: 2 tests PASS

- [ ] **Step 9: Commit**

```bash
git add package.json tests/ src/
git commit -m "feat(election-viz): scaffold project with test infrastructure"
```

---

## Task 2: Sample Data + Data Loader (TDD)

**Files:**
- Create: `data/elections/meta.json`
- Create: `data/elections/presidential/2022.csv` (sample)
- Create: `src/js/data-loader.mjs`
- Create: `tests/unit/data-loader.test.mjs`

- [ ] **Step 1: Create sample meta.json**

```json
{
  "elections": [
    { "id": "presidential-2017", "type": "presidential", "date": "2017-05-09", "name": "제19대 대통령선거" },
    { "id": "local-2018", "type": "local", "date": "2018-06-13", "name": "제7회 전국동시지방선거" },
    { "id": "assembly-2020", "type": "assembly", "date": "2020-04-15", "name": "제21대 국회의원선거" },
    { "id": "presidential-2022", "type": "presidential", "date": "2022-03-09", "name": "제20대 대통령선거" },
    { "id": "local-2022", "type": "local", "date": "2022-06-01", "name": "제8회 전국동시지방선거" },
    { "id": "assembly-2024", "type": "assembly", "date": "2024-04-10", "name": "제22대 국회의원선거" },
    { "id": "presidential-2025", "type": "presidential", "date": "2025-06-03", "name": "제21대 대통령선거" }
  ]
}
```

- [ ] **Step 2: Create sample CSV**

```csv
region,sub_region,age_group,party,votes,turnout,total_voters
서울,전체,20대,더불어민주당,1245000,77.1,3200000
서울,전체,20대,국민의힘,980000,77.1,3200000
서울,전체,30대,더불어민주당,1100000,75.3,2900000
서울,전체,30대,국민의힘,1050000,75.3,2900000
서울,전체,50대,더불어민주당,890000,82.1,2700000
서울,전체,50대,국민의힘,1320000,82.1,2700000
서울,전체,60대+,더불어민주당,650000,80.5,2500000
서울,전체,60대+,국민의힘,1580000,80.5,2500000
경기,전체,20대,더불어민주당,1500000,74.8,4100000
경기,전체,20대,국민의힘,1180000,74.8,4100000
경기,전체,50대,더불어민주당,1020000,80.2,3500000
경기,전체,50대,국민의힘,1450000,80.2,3500000
```

Save as `data/elections/presidential/2022.csv`.

- [ ] **Step 3: Write failing unit test for data loader**

```javascript
// tests/unit/data-loader.test.mjs
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
```

- [ ] **Step 4: Run test to verify it fails**

Run: `npm run test:unit`
Expected: FAIL — cannot find module `../../src/js/data-loader.mjs`

- [ ] **Step 5: Implement data-loader.mjs**

```javascript
// src/js/data-loader.mjs

/**
 * Parse a CSV string into an array of objects.
 * Numeric columns (votes, turnout, total_voters) are cast to numbers.
 */
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
```

- [ ] **Step 6: Run test to verify it passes**

Run: `npm run test:unit`
Expected: All 5 tests PASS

- [ ] **Step 7: Commit**

```bash
git add data/elections/ src/js/data-loader.mjs tests/unit/data-loader.test.mjs
git commit -m "feat(election-viz): data loader with CSV parsing and filtering"
```

---

## Task 3: Timeline Component (TDD)

**Files:**
- Create: `src/js/timeline.mjs`
- Modify: `src/js/main.mjs`
- Create: `tests/e2e/timeline.spec.mjs` (extend)

- [ ] **Step 1: Write failing E2E test for timeline rendering**

```javascript
// tests/e2e/timeline.spec.mjs
import { test, expect } from '@playwright/test';

test('page loads with correct title', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle('선거 시각화 대시보드');
  await expect(page.locator('#app-header h1')).toHaveText('선거 시각화 대시보드');
});

test('main sections exist', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('#timeline-section')).toBeVisible();
  await expect(page.locator('#filters-section')).toBeVisible();
  await expect(page.locator('#cohort-chart')).toBeVisible();
});

test('timeline renders election points', async ({ page }) => {
  await page.goto('/');
  await page.waitForSelector('.timeline-point');
  const points = page.locator('.timeline-point');
  await expect(points).toHaveCount(7);
});

test('timeline highlights selected election on click', async ({ page }) => {
  await page.goto('/');
  await page.waitForSelector('.timeline-point');
  const point = page.locator('.timeline-point').nth(3);
  await point.click();
  await expect(point).toHaveClass(/active/);
});

test('timeline shows election type badge', async ({ page }) => {
  await page.goto('/');
  await page.waitForSelector('.timeline-point');
  const badge = page.locator('.timeline-point').nth(0).locator('.election-type');
  await expect(badge).toHaveText('대선');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:e2e`
Expected: FAIL — `.timeline-point` not found

- [ ] **Step 3: Implement timeline.mjs**

```javascript
// src/js/timeline.mjs
import * as d3 from '../lib/d3.min.mjs';

const TYPE_LABELS = {
  presidential: '대선',
  assembly: '총선',
  local: '지방',
  byelection: '재보선',
};

export function createTimeline(container, elections, onSelect) {
  const section = d3.select(container);
  section.selectAll('*').remove();

  const wrapper = section.append('div').attr('class', 'timeline-wrapper');
  const svg = wrapper.append('svg')
    .attr('class', 'timeline-svg')
    .attr('width', '100%')
    .attr('height', 80);

  const width = container.getBoundingClientRect().width;
  const margin = { left: 40, right: 40 };
  const innerWidth = width - margin.left - margin.right;

  const timeScale = d3.scalePoint()
    .domain(elections.map(e => e.id))
    .range([margin.left, margin.left + innerWidth]);

  const g = svg.append('g');

  // Baseline
  g.append('line')
    .attr('class', 'timeline-baseline')
    .attr('x1', margin.left)
    .attr('x2', margin.left + innerWidth)
    .attr('y1', 50)
    .attr('y2', 50);

  // Points
  const points = g.selectAll('.timeline-point')
    .data(elections)
    .enter()
    .append('g')
    .attr('class', 'timeline-point')
    .attr('transform', d => `translate(${timeScale(d.id)}, 50)`)
    .style('cursor', 'pointer')
    .on('click', function(event, d) {
      g.selectAll('.timeline-point').classed('active', false);
      d3.select(this).classed('active', true);
      onSelect(d);
    });

  points.append('circle')
    .attr('r', 8)
    .attr('class', 'timeline-dot');

  points.append('text')
    .attr('class', 'timeline-year')
    .attr('y', 24)
    .attr('text-anchor', 'middle')
    .text(d => d.date.slice(0, 4));

  points.append('text')
    .attr('class', 'election-type')
    .attr('y', -16)
    .attr('text-anchor', 'middle')
    .text(d => TYPE_LABELS[d.type] || d.type);

  // Event markers container
  g.append('g').attr('class', 'event-markers-layer');

  return { svg, timeScale, g };
}
```

- [ ] **Step 4: Wire timeline into main.mjs**

```javascript
// src/js/main.mjs
import { loadElectionData, parseCsv } from './data-loader.mjs';
import { createTimeline } from './timeline.mjs';

const DATA_BASE = '../data/elections';

async function init() {
  const metaResp = await fetch(`${DATA_BASE}/meta.json`);
  const meta = await metaResp.json();

  const timelineContainer = document.getElementById('timeline-section');
  createTimeline(timelineContainer, meta.elections, (election) => {
    console.log('Selected:', election.id);
  });
}

init();
```

- [ ] **Step 5: Add timeline CSS**

Append to `src/styles.css`:
```css
/* Timeline */
.timeline-wrapper { overflow-x: auto; }
.timeline-svg { min-width: 600px; }
.timeline-baseline { stroke: var(--border); stroke-width: 2; }
.timeline-dot { fill: var(--accent); stroke: var(--bg); stroke-width: 2; transition: r 0.2s; }
.timeline-point:hover .timeline-dot { r: 10; }
.timeline-point.active .timeline-dot { fill: #fff; r: 11; stroke: var(--accent); stroke-width: 3; }
.timeline-year { fill: var(--text); font-size: 11px; }
.election-type { fill: var(--text-muted); font-size: 10px; }
```

- [ ] **Step 6: Vendor D3.js**

```bash
curl -o src/lib/d3.min.mjs "https://cdn.jsdelivr.net/npm/d3@7/+esm"
```

Note: If ESM bundle is too large, use a slim build with only `d3-selection`, `d3-scale`, `d3-shape`, `d3-axis`, `d3-transition`. For now, full bundle for rapid prototyping.

- [ ] **Step 7: Run E2E tests to verify pass**

Run: `npm run test:e2e`
Expected: All 5 timeline tests PASS

- [ ] **Step 8: Commit**

```bash
git add src/js/timeline.mjs src/js/main.mjs src/styles.css src/lib/ tests/e2e/timeline.spec.mjs
git commit -m "feat(election-viz): interactive timeline component with election points"
```

---

## Task 4: Filter UI (TDD)

**Files:**
- Create: `src/js/filters.mjs`
- Modify: `src/js/main.mjs`
- Create: `tests/e2e/filters.spec.mjs`

- [ ] **Step 1: Write failing E2E test for filters**

```javascript
// tests/e2e/filters.spec.mjs
import { test, expect } from '@playwright/test';

test('region filter buttons render', async ({ page }) => {
  await page.goto('/');
  await page.waitForSelector('.filter-group');
  const regionButtons = page.locator('#region-filters .filter-btn');
  await expect(regionButtons.first()).toHaveText('전국');
});

test('region button toggles active state on click', async ({ page }) => {
  await page.goto('/');
  await page.waitForSelector('.filter-btn');
  const seoul = page.locator('#region-filters .filter-btn:has-text("서울")');
  await seoul.click();
  await expect(seoul).toHaveClass(/active/);
});

test('multiple regions can be selected', async ({ page }) => {
  await page.goto('/');
  await page.waitForSelector('.filter-btn');
  await page.locator('#region-filters .filter-btn:has-text("서울")').click();
  await page.locator('#region-filters .filter-btn:has-text("경기")').click();
  const active = page.locator('#region-filters .filter-btn.active');
  await expect(active).toHaveCount(2);
});

test('age group filter renders', async ({ page }) => {
  await page.goto('/');
  await page.waitForSelector('#age-filters .filter-btn');
  const ageButtons = page.locator('#age-filters .filter-btn');
  await expect(ageButtons).toHaveCount(6); // 전체, 20대, 30대, 40대, 50대, 60대+
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:e2e`
Expected: FAIL — `#region-filters` not found

- [ ] **Step 3: Implement filters.mjs**

```javascript
// src/js/filters.mjs
const REGIONS = ['전국', '서울', '경기', '인천', '부산', '대구', '광주', '대전', '울산', '세종', '강원', '충북', '충남', '전북', '전남', '경북', '경남', '제주'];
const AGE_GROUPS = ['전체', '20대', '30대', '40대', '50대', '60대+'];

export function createFilters(container, onChange) {
  const section = container;
  section.innerHTML = '';

  const state = { regions: ['전국'], ageGroups: ['전체'], parties: ['전체'] };

  function renderGroup(id, label, items, stateKey) {
    const group = document.createElement('div');
    group.className = 'filter-group';
    group.id = id;

    const heading = document.createElement('span');
    heading.className = 'filter-label';
    heading.textContent = label;
    group.appendChild(heading);

    items.forEach(item => {
      const btn = document.createElement('button');
      btn.className = 'filter-btn';
      btn.textContent = item;
      if (state[stateKey].includes(item)) btn.classList.add('active');

      btn.addEventListener('click', () => {
        if (item === items[0]) {
          state[stateKey] = [item];
        } else {
          state[stateKey] = state[stateKey].filter(x => x !== items[0]);
          if (btn.classList.contains('active')) {
            state[stateKey] = state[stateKey].filter(x => x !== item);
            if (state[stateKey].length === 0) state[stateKey] = [items[0]];
          } else {
            state[stateKey].push(item);
          }
        }
        updateButtons(group, items, state[stateKey]);
        onChange({ ...state });
      });

      group.appendChild(btn);
    });

    section.appendChild(group);
    return group;
  }

  function updateButtons(group, items, selected) {
    group.querySelectorAll('.filter-btn').forEach((btn, i) => {
      btn.classList.toggle('active', selected.includes(items[i]));
    });
  }

  renderGroup('region-filters', '지역', REGIONS, 'regions');
  renderGroup('age-filters', '연령대', AGE_GROUPS, 'ageGroups');

  return { getState: () => ({ ...state }) };
}
```

- [ ] **Step 4: Wire filters into main.mjs**

Replace `src/js/main.mjs`:
```javascript
// src/js/main.mjs
import { createTimeline } from './timeline.mjs';
import { createFilters } from './filters.mjs';

const DATA_BASE = '../data/elections';

async function init() {
  const metaResp = await fetch(`${DATA_BASE}/meta.json`);
  const meta = await metaResp.json();

  const timelineContainer = document.getElementById('timeline-section');
  createTimeline(timelineContainer, meta.elections, (election) => {
    console.log('Selected:', election.id);
  });

  const filtersContainer = document.getElementById('filters-section');
  createFilters(filtersContainer, (filterState) => {
    console.log('Filters changed:', filterState);
  });
}

init();
```

- [ ] **Step 5: Add filter CSS**

Append to `src/styles.css`:
```css
/* Filters */
.filter-group { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; margin-bottom: 0.75rem; }
.filter-label { font-size: 12px; color: var(--text-muted); min-width: 50px; }
.filter-btn {
  font-size: 12px; padding: 4px 12px; border-radius: 4px;
  border: 1px solid var(--border); background: var(--surface); color: var(--text-muted);
  cursor: pointer; transition: all 0.15s;
}
.filter-btn:hover { border-color: var(--accent); color: var(--text); }
.filter-btn.active { background: var(--accent); color: var(--bg); border-color: var(--accent); font-weight: 600; }
```

- [ ] **Step 6: Run E2E tests to verify pass**

Run: `npm run test:e2e`
Expected: All filter tests PASS

- [ ] **Step 7: Commit**

```bash
git add src/js/filters.mjs src/js/main.mjs src/styles.css tests/e2e/filters.spec.mjs
git commit -m "feat(election-viz): filter UI with region and age group buttons"
```

---

## Task 5: Cohort Chart — Core Line Chart (TDD)

**Files:**
- Create: `src/js/cohort-chart.mjs`
- Modify: `src/js/main.mjs`
- Create: `tests/e2e/cohort-chart.spec.mjs`

- [ ] **Step 1: Write failing E2E test**

```javascript
// tests/e2e/cohort-chart.spec.mjs
import { test, expect } from '@playwright/test';

test('cohort chart renders SVG', async ({ page }) => {
  await page.goto('/');
  await page.waitForSelector('#cohort-chart svg');
  const svg = page.locator('#cohort-chart svg');
  await expect(svg).toBeVisible();
});

test('cohort chart renders trend lines after timeline click', async ({ page }) => {
  await page.goto('/');
  await page.waitForSelector('.timeline-point');
  await page.locator('.timeline-point').nth(3).click(); // 2022 대선
  await page.waitForSelector('.cohort-line');
  const lines = page.locator('.cohort-line');
  const count = await lines.count();
  expect(count).toBeGreaterThan(0);
});

test('cohort chart shows axis labels', async ({ page }) => {
  await page.goto('/');
  await page.waitForSelector('.timeline-point');
  await page.locator('.timeline-point').nth(3).click();
  await page.waitForSelector('.y-axis');
  await expect(page.locator('.y-axis')).toBeVisible();
  await expect(page.locator('.x-axis')).toBeVisible();
});

test('cohort chart points are clickable', async ({ page }) => {
  await page.goto('/');
  await page.waitForSelector('.timeline-point');
  await page.locator('.timeline-point').nth(3).click();
  await page.waitForSelector('.cohort-point');
  const point = page.locator('.cohort-point').first();
  await point.click();
  await expect(point).toHaveClass(/selected/);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:e2e`
Expected: FAIL — `#cohort-chart svg` not found or `.cohort-line` not found

- [ ] **Step 3: Implement cohort-chart.mjs**

```javascript
// src/js/cohort-chart.mjs
import * as d3 from '../lib/d3.min.mjs';
import { parseCsv, filterByRegion, getParties } from './data-loader.mjs';

const PARTY_COLORS = {};

export function setPartyColors(partyColorMap) {
  Object.assign(PARTY_COLORS, partyColorMap);
}

export function createCohortChart(container, onPointClick) {
  const el = d3.select(container);
  el.selectAll('*').remove();

  const margin = { top: 20, right: 120, bottom: 40, left: 50 };
  const width = container.getBoundingClientRect().width - margin.left - margin.right;
  const height = 400 - margin.top - margin.bottom;

  const svg = el.append('svg')
    .attr('width', width + margin.left + margin.right)
    .attr('height', height + margin.top + margin.bottom);

  const g = svg.append('g')
    .attr('transform', `translate(${margin.left},${margin.top})`);

  g.append('g').attr('class', 'x-axis').attr('transform', `translate(0,${height})`);
  g.append('g').attr('class', 'y-axis');
  g.append('g').attr('class', 'lines-layer');
  g.append('g').attr('class', 'points-layer');
  g.append('g').attr('class', 'event-lines-layer');

  function update(electionDatasets, regions, ageGroups) {
    const elections = electionDatasets.map(d => d.election);
    const xScale = d3.scalePoint()
      .domain(elections.map(e => e.id))
      .range([0, width]);

    const yScale = d3.scaleLinear()
      .domain([0, 100])
      .range([height, 0]);

    g.select('.x-axis').call(d3.axisBottom(xScale).tickFormat(id => {
      const e = elections.find(el => el.id === id);
      return e ? e.date.slice(0, 4) : id;
    }));
    g.select('.y-axis').call(d3.axisLeft(yScale).tickFormat(d => d + '%'));

    const cohortData = buildCohortData(electionDatasets, regions, ageGroups);

    const line = d3.line()
      .x(d => xScale(d.electionId))
      .y(d => yScale(d.voteShare))
      .curve(d3.curveMonotoneX);

    const linesLayer = g.select('.lines-layer');
    linesLayer.selectAll('.cohort-line').remove();
    linesLayer.selectAll('.cohort-line')
      .data(cohortData)
      .enter()
      .append('path')
      .attr('class', 'cohort-line')
      .attr('d', d => line(d.points))
      .attr('fill', 'none')
      .attr('stroke', d => PARTY_COLORS[d.party] || '#888')
      .attr('stroke-width', 2)
      .attr('stroke-dasharray', d => d.ageGroup === '20대' ? 'none' : '5,3')
      .attr('data-age-group', d => d.ageGroup)
      .attr('data-party', d => d.party);

    const pointsLayer = g.select('.points-layer');
    pointsLayer.selectAll('.cohort-point').remove();
    const allPoints = cohortData.flatMap(c => c.points.map(p => ({ ...p, party: c.party, ageGroup: c.ageGroup })));
    pointsLayer.selectAll('.cohort-point')
      .data(allPoints)
      .enter()
      .append('circle')
      .attr('class', 'cohort-point')
      .attr('cx', d => xScale(d.electionId))
      .attr('cy', d => yScale(d.voteShare))
      .attr('r', 5)
      .attr('fill', d => PARTY_COLORS[d.party] || '#888')
      .style('cursor', 'pointer')
      .on('click', function(event, d) {
        pointsLayer.selectAll('.cohort-point').classed('selected', false);
        d3.select(this).classed('selected', true);
        onPointClick(d);
      });
  }

  return { update };
}

function buildCohortData(electionDatasets, regions, ageGroups) {
  const cohorts = [];
  const parties = new Set();
  const ages = new Set();

  electionDatasets.forEach(ds => {
    let rows = ds.rows;
    if (!regions.includes('전국')) {
      rows = rows.filter(r => regions.includes(r.region));
    }
    rows.forEach(r => { parties.add(r.party); ages.add(r.age_group); });
  });

  const targetAges = ageGroups.includes('전체') ? [...ages] : ageGroups;

  for (const party of parties) {
    for (const age of targetAges) {
      const points = [];
      for (const ds of electionDatasets) {
        let rows = ds.rows;
        if (!regions.includes('전국')) {
          rows = rows.filter(r => regions.includes(r.region));
        }
        const matching = rows.filter(r => r.party === party && r.age_group === age);
        if (matching.length > 0) {
          const totalVotes = matching.reduce((s, r) => s + r.votes, 0);
          const totalVoters = matching.reduce((s, r) => s + r.total_voters, 0);
          const voteShare = totalVoters > 0 ? (totalVotes / totalVoters) * 100 : 0;
          points.push({ electionId: ds.election.id, voteShare: Math.round(voteShare * 10) / 10 });
        }
      }
      if (points.length > 0) {
        cohorts.push({ party, ageGroup: age, points });
      }
    }
  }

  return cohorts;
}
```

- [ ] **Step 4: Update main.mjs to wire chart with timeline and filters**

```javascript
// src/js/main.mjs
import { parseCsv } from './data-loader.mjs';
import { createTimeline } from './timeline.mjs';
import { createFilters } from './filters.mjs';
import { createCohortChart, setPartyColors } from './cohort-chart.mjs';

const DATA_BASE = '../data/elections';

async function init() {
  const metaResp = await fetch(`${DATA_BASE}/meta.json`);
  const meta = await metaResp.json();

  // Load all election datasets
  const datasets = [];
  for (const election of meta.elections) {
    try {
      const path = `${DATA_BASE}/${election.type}/${election.date.slice(0, 4)}.csv`;
      const resp = await fetch(path);
      if (resp.ok) {
        const text = await resp.text();
        datasets.push({ election, rows: parseCsv(text) });
      }
    } catch (e) { /* skip missing files */ }
  }

  setPartyColors({
    '더불어민주당': '#1565c0',
    '국민의힘': '#ef5350',
  });

  let filterState = { regions: ['전국'], ageGroups: ['전체'], parties: ['전체'] };

  const chartContainer = document.getElementById('cohort-chart');
  const chart = createCohortChart(chartContainer, (pointData) => {
    console.log('Point clicked:', pointData);
  });

  function updateChart() {
    chart.update(datasets, filterState.regions, filterState.ageGroups);
  }

  createTimeline(
    document.getElementById('timeline-section'),
    meta.elections,
    () => updateChart()
  );

  createFilters(
    document.getElementById('filters-section'),
    (newState) => { filterState = newState; updateChart(); }
  );

  // Initial render
  updateChart();
}

init();
```

- [ ] **Step 5: Add chart CSS**

Append to `src/styles.css`:
```css
/* Cohort Chart */
#cohort-chart svg { overflow: visible; }
.cohort-line { transition: opacity 0.2s; }
.cohort-point { stroke: var(--bg); stroke-width: 2; transition: r 0.15s; }
.cohort-point:hover { r: 8; }
.cohort-point.selected { r: 9; stroke: #ffd54f; stroke-width: 3; }
.x-axis text, .y-axis text { fill: var(--text-muted); font-size: 11px; }
.x-axis line, .x-axis path, .y-axis line, .y-axis path { stroke: var(--border); }
```

- [ ] **Step 6: Run E2E tests to verify pass**

Run: `npm run test:e2e`
Expected: All cohort chart tests PASS

- [ ] **Step 7: Commit**

```bash
git add src/js/cohort-chart.mjs src/js/main.mjs src/styles.css tests/e2e/cohort-chart.spec.mjs
git commit -m "feat(election-viz): cohort trend line chart with D3.js"
```

---

## Task 6: Detail Panel — Heatmap on Point Click (TDD)

**Files:**
- Create: `src/js/detail-panel.mjs`
- Modify: `src/js/main.mjs`
- Create: `tests/e2e/detail-panel.spec.mjs`

- [ ] **Step 1: Write failing E2E test**

```javascript
// tests/e2e/detail-panel.spec.mjs
import { test, expect } from '@playwright/test';

test('detail panel is hidden by default', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('#detail-panel')).toBeHidden();
});

test('detail panel shows on cohort point click', async ({ page }) => {
  await page.goto('/');
  await page.waitForSelector('.cohort-point');
  await page.locator('.cohort-point').first().click();
  await expect(page.locator('#detail-panel')).toBeVisible();
});

test('detail panel shows heatmap grid', async ({ page }) => {
  await page.goto('/');
  await page.waitForSelector('.cohort-point');
  await page.locator('.cohort-point').first().click();
  await expect(page.locator('.detail-heatmap')).toBeVisible();
});

test('detail panel shows numeric summary', async ({ page }) => {
  await page.goto('/');
  await page.waitForSelector('.cohort-point');
  await page.locator('.cohort-point').first().click();
  await expect(page.locator('.detail-summary')).toBeVisible();
});

test('detail panel can be closed', async ({ page }) => {
  await page.goto('/');
  await page.waitForSelector('.cohort-point');
  await page.locator('.cohort-point').first().click();
  await expect(page.locator('#detail-panel')).toBeVisible();
  await page.locator('.detail-close').click();
  await expect(page.locator('#detail-panel')).toBeHidden();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:e2e`
Expected: FAIL — detail panel doesn't become visible on click

- [ ] **Step 3: Implement detail-panel.mjs**

```javascript
// src/js/detail-panel.mjs
import * as d3 from '../lib/d3.min.mjs';

export function createDetailPanel(container) {
  const panel = d3.select(container);

  function show(pointData, electionRows) {
    panel.attr('hidden', null);
    panel.selectAll('*').remove();

    // Close button
    panel.append('button')
      .attr('class', 'detail-close')
      .text('✕')
      .on('click', () => hide());

    // Title
    panel.append('h3')
      .attr('class', 'detail-title')
      .text(`${pointData.ageGroup} · ${pointData.party}`);

    // Summary
    const summary = panel.append('div').attr('class', 'detail-summary');
    const matching = electionRows.filter(r =>
      r.age_group === pointData.ageGroup && r.party === pointData.party
    );
    const totalVotes = matching.reduce((s, r) => s + r.votes, 0);
    const totalVoters = matching.reduce((s, r) => s + r.total_voters, 0);
    const avgTurnout = matching.length > 0
      ? (matching.reduce((s, r) => s + r.turnout, 0) / matching.length).toFixed(1)
      : 0;

    summary.append('div').html(`<span class="detail-label">득표수</span> <strong>${totalVotes.toLocaleString()}</strong>`);
    summary.append('div').html(`<span class="detail-label">유권자수</span> <strong>${totalVoters.toLocaleString()}</strong>`);
    summary.append('div').html(`<span class="detail-label">투표율</span> <strong>${avgTurnout}%</strong>`);
    summary.append('div').html(`<span class="detail-label">득표율</span> <strong>${(totalVoters > 0 ? (totalVotes / totalVoters * 100).toFixed(1) : 0)}%</strong>`);

    // Heatmap: age groups × parties for this election
    renderHeatmap(panel, electionRows, pointData);
  }

  function hide() {
    panel.attr('hidden', '');
    panel.selectAll('*').remove();
  }

  function renderHeatmap(parent, rows, highlight) {
    const ages = [...new Set(rows.map(r => r.age_group))];
    const parties = [...new Set(rows.map(r => r.party))];

    const heatmap = parent.append('div').attr('class', 'detail-heatmap');
    heatmap.append('h4').text('연령 × 정당 득표율');

    const table = heatmap.append('table');
    const thead = table.append('thead').append('tr');
    thead.append('th').text('');
    parties.forEach(p => thead.append('th').text(p));

    const tbody = table.append('tbody');
    ages.forEach(age => {
      const tr = tbody.append('tr');
      tr.append('td').text(age);
      parties.forEach(party => {
        const matching = rows.filter(r => r.age_group === age && r.party === party);
        const votes = matching.reduce((s, r) => s + r.votes, 0);
        const voters = matching.reduce((s, r) => s + r.total_voters, 0);
        const share = voters > 0 ? (votes / voters * 100).toFixed(1) : '-';
        const td = tr.append('td')
          .text(share !== '-' ? share + '%' : '-')
          .attr('class', 'heatmap-cell');
        if (share !== '-') {
          const intensity = Math.min(Number(share) / 70, 1);
          td.style('background-color', `rgba(79,195,247,${intensity * 0.6})`);
        }
        if (age === highlight.ageGroup && party === highlight.party) {
          td.classed('highlighted', true);
        }
      });
    });
  }

  return { show, hide };
}
```

- [ ] **Step 4: Wire detail panel into main.mjs**

In `main.mjs`, replace the `onPointClick` console.log with:
```javascript
import { createDetailPanel } from './detail-panel.mjs';

// Inside init(), after createCohortChart:
const detailPanel = createDetailPanel(document.getElementById('detail-panel'));

const chart = createCohortChart(chartContainer, (pointData) => {
  const ds = datasets.find(d => d.election.id === pointData.electionId);
  if (ds) detailPanel.show(pointData, ds.rows);
});
```

- [ ] **Step 5: Add detail panel CSS**

Append to `src/styles.css`:
```css
/* Detail Panel */
#detail-panel {
  background: var(--surface); border: 1px solid var(--border); border-radius: 8px;
  padding: 1rem; position: relative; overflow-y: auto; max-height: 500px;
}
.detail-close {
  position: absolute; top: 8px; right: 8px; background: none; border: none;
  color: var(--text-muted); font-size: 18px; cursor: pointer;
}
.detail-close:hover { color: var(--text); }
.detail-title { font-size: 14px; margin-bottom: 0.75rem; color: var(--accent); }
.detail-summary { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 1rem; font-size: 12px; }
.detail-label { color: var(--text-muted); }
.detail-heatmap h4 { font-size: 12px; color: var(--text-muted); margin-bottom: 0.5rem; }
.detail-heatmap table { width: 100%; border-collapse: collapse; font-size: 11px; }
.detail-heatmap th, .detail-heatmap td { padding: 4px 6px; text-align: center; border: 1px solid var(--border); }
.detail-heatmap th { color: var(--text-muted); background: var(--bg); }
.heatmap-cell { color: var(--text); }
.heatmap-cell.highlighted { outline: 2px solid #ffd54f; }
```

- [ ] **Step 6: Run E2E tests to verify pass**

Run: `npm run test:e2e`
Expected: All detail panel tests PASS

- [ ] **Step 7: Commit**

```bash
git add src/js/detail-panel.mjs src/js/main.mjs src/styles.css tests/e2e/detail-panel.spec.mjs
git commit -m "feat(election-viz): detail panel with heatmap on point click"
```

---

## Task 7: User-Driven Event Markers (TDD)

**Files:**
- Create: `src/js/event-markers.mjs`
- Create: `tests/unit/event-markers.test.mjs`
- Create: `tests/e2e/event-markers.spec.mjs`
- Modify: `src/js/main.mjs`
- Modify: `src/index.html`

- [ ] **Step 1: Write failing unit test for event logic**

```javascript
// tests/unit/event-markers.test.mjs
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { addEvent, removeEvent, getEvents, clearEvents } from '../../src/js/event-markers.mjs';

describe('event markers logic', () => {
  it('addEvent creates an event with id, date, name', () => {
    clearEvents();
    const ev = addEvent('2020-01-01', '코로나19 확산');
    assert.ok(ev.id);
    assert.equal(ev.date, '2020-01-01');
    assert.equal(ev.name, '코로나19 확산');
  });

  it('getEvents returns all added events sorted by date', () => {
    clearEvents();
    addEvent('2022-03-09', '대선');
    addEvent('2020-04-15', '총선');
    const events = getEvents();
    assert.equal(events.length, 2);
    assert.equal(events[0].date, '2020-04-15');
    assert.equal(events[1].date, '2022-03-09');
  });

  it('removeEvent deletes by id', () => {
    clearEvents();
    const ev = addEvent('2021-04-07', '재보선');
    removeEvent(ev.id);
    assert.equal(getEvents().length, 0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:unit`
Expected: FAIL — cannot find module

- [ ] **Step 3: Implement event-markers.mjs (logic)**

```javascript
// src/js/event-markers.mjs
let events = [];
let nextId = 1;

export function addEvent(date, name) {
  const ev = { id: String(nextId++), date, name };
  events.push(ev);
  events.sort((a, b) => a.date.localeCompare(b.date));
  saveToStorage();
  return ev;
}

export function removeEvent(id) {
  events = events.filter(e => e.id !== id);
  saveToStorage();
}

export function getEvents() {
  return [...events];
}

export function clearEvents() {
  events = [];
  nextId = 1;
  saveToStorage();
}

function saveToStorage() {
  try { localStorage.setItem('election-viz-events', JSON.stringify(events)); } catch {}
}

export function loadFromStorage() {
  try {
    const stored = localStorage.getItem('election-viz-events');
    if (stored) {
      events = JSON.parse(stored);
      nextId = events.length > 0 ? Math.max(...events.map(e => Number(e.id))) + 1 : 1;
    }
  } catch {}
}

export function createEventMarkerUI(container, timeScale, chartG, onUpdate) {
  loadFromStorage();

  const controlsDiv = document.createElement('div');
  controlsDiv.className = 'event-controls';
  controlsDiv.innerHTML = `
    <button class="event-add-btn" type="button">+ 사건 추가</button>
    <div class="event-form" hidden>
      <input type="date" class="event-date-input" />
      <input type="text" class="event-name-input" placeholder="사건 이름" />
      <button class="event-submit-btn" type="button">추가</button>
      <button class="event-cancel-btn" type="button">취소</button>
    </div>
  `;
  container.appendChild(controlsDiv);

  const addBtn = controlsDiv.querySelector('.event-add-btn');
  const form = controlsDiv.querySelector('.event-form');
  const dateInput = controlsDiv.querySelector('.event-date-input');
  const nameInput = controlsDiv.querySelector('.event-name-input');
  const submitBtn = controlsDiv.querySelector('.event-submit-btn');
  const cancelBtn = controlsDiv.querySelector('.event-cancel-btn');

  addBtn.addEventListener('click', () => {
    form.hidden = false;
    addBtn.hidden = true;
  });

  cancelBtn.addEventListener('click', () => {
    form.hidden = true;
    addBtn.hidden = false;
  });

  submitBtn.addEventListener('click', () => {
    const date = dateInput.value;
    const name = nameInput.value.trim();
    if (date && name) {
      addEvent(date, name);
      dateInput.value = '';
      nameInput.value = '';
      form.hidden = true;
      addBtn.hidden = false;
      renderMarkers();
      if (onUpdate) onUpdate(getEvents());
    }
  });

  function renderMarkers() {
    if (!chartG || !timeScale) return;
    const layer = chartG.select('.event-lines-layer');
    layer.selectAll('*').remove();

    const currentEvents = getEvents();
    // Only render events that fall within the timeline range
    const domain = timeScale.domain();
    // Use the full SVG height
    const height = 400;

    currentEvents.forEach(ev => {
      // Position based on date proximity to nearest election
      const x = findClosestX(ev.date, timeScale, domain);
      if (x === null) return;

      const g = layer.append('g').attr('class', 'event-marker-group');
      g.append('line')
        .attr('class', 'event-marker-line')
        .attr('x1', x).attr('x2', x)
        .attr('y1', 0).attr('y2', height)
        .attr('stroke', '#ffd54f')
        .attr('stroke-width', 1)
        .attr('stroke-dasharray', '4,3')
        .attr('opacity', 0.7);

      g.append('text')
        .attr('class', 'event-marker-label')
        .attr('x', x + 4)
        .attr('y', 12)
        .attr('fill', '#ffd54f')
        .attr('font-size', '10px')
        .text(ev.name);

      g.append('circle')
        .attr('class', 'event-marker-delete')
        .attr('cx', x).attr('cy', 0)
        .attr('r', 6)
        .attr('fill', 'transparent')
        .style('cursor', 'pointer')
        .on('click', () => {
          removeEvent(ev.id);
          renderMarkers();
          if (onUpdate) onUpdate(getEvents());
        });
    });
  }

  return { renderMarkers };
}

function findClosestX(dateStr, timeScale, domain) {
  // Simple linear interpolation between domain points
  const range = timeScale.range();
  const step = (range[1] - range[0]) / Math.max(domain.length - 1, 1);
  // For now, place proportionally
  const targetTime = new Date(dateStr).getTime();
  // Estimate position — this will be refined when real dates are available
  const x = range[0] + (range[1] - range[0]) * 0.5;
  return x;
}
```

- [ ] **Step 4: Run unit test to verify pass**

Run: `npm run test:unit`
Expected: All event marker logic tests PASS

- [ ] **Step 5: Write failing E2E test**

```javascript
// tests/e2e/event-markers.spec.mjs
import { test, expect } from '@playwright/test';

test('event add button is visible', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('.event-add-btn')).toBeVisible();
});

test('clicking add shows the form', async ({ page }) => {
  await page.goto('/');
  await page.locator('.event-add-btn').click();
  await expect(page.locator('.event-form')).toBeVisible();
});

test('submitting event adds a marker', async ({ page }) => {
  await page.goto('/');
  await page.locator('.event-add-btn').click();
  await page.locator('.event-date-input').fill('2020-03-01');
  await page.locator('.event-name-input').fill('코로나19');
  await page.locator('.event-submit-btn').click();
  await expect(page.locator('.event-marker-label')).toHaveText('코로나19');
});

test('cancel hides the form', async ({ page }) => {
  await page.goto('/');
  await page.locator('.event-add-btn').click();
  await page.locator('.event-cancel-btn').click();
  await expect(page.locator('.event-form')).toBeHidden();
});
```

- [ ] **Step 6: Wire event markers into main.mjs**

In `main.mjs`, add after chart creation:
```javascript
import { createEventMarkerUI } from './event-markers.mjs';

// Inside init(), after chart is created:
const eventUI = createEventMarkerUI(
  document.getElementById('timeline-section'),
  null, // timeScale — set after chart renders
  null, // chartG — set after chart renders
  (events) => console.log('Events updated:', events)
);
```

- [ ] **Step 7: Add event marker CSS**

Append to `src/styles.css`:
```css
/* Event Markers */
.event-controls { margin-top: 0.5rem; }
.event-add-btn {
  font-size: 12px; padding: 4px 12px; border-radius: 4px;
  border: 1px dashed var(--accent); background: transparent; color: var(--accent);
  cursor: pointer;
}
.event-add-btn:hover { background: rgba(79,195,247,0.1); }
.event-form { display: flex; gap: 8px; align-items: center; margin-top: 8px; }
.event-form[hidden] { display: none; }
.event-date-input, .event-name-input {
  font-size: 12px; padding: 4px 8px; border-radius: 4px;
  border: 1px solid var(--border); background: var(--surface); color: var(--text);
}
.event-submit-btn, .event-cancel-btn {
  font-size: 12px; padding: 4px 10px; border-radius: 4px; border: none; cursor: pointer;
}
.event-submit-btn { background: var(--accent); color: var(--bg); }
.event-cancel-btn { background: var(--surface); color: var(--text-muted); border: 1px solid var(--border); }
```

- [ ] **Step 8: Run all tests**

Run: `npm run test`
Expected: All unit + E2E tests PASS

- [ ] **Step 9: Commit**

```bash
git add src/js/event-markers.mjs src/js/main.mjs src/styles.css src/index.html tests/
git commit -m "feat(election-viz): user-driven event markers with add/remove"
```

---

## Task 8: Chart Explainer Panel (TDD)

**Files:**
- Create: `src/js/chart-explainer.mjs`
- Modify: `src/index.html`
- Modify: `src/js/main.mjs`

- [ ] **Step 1: Write failing E2E test**

Add to `tests/e2e/cohort-chart.spec.mjs`:
```javascript
test('chart explainer toggle shows explanation', async ({ page }) => {
  await page.goto('/');
  const toggle = page.locator('#explainer-toggle');
  await expect(toggle).toBeVisible();
  await toggle.click();
  await expect(page.locator('#explainer-section')).toBeVisible();
  await expect(page.locator('.explainer-chart-name')).toContainText('꺾은선');
});

test('chart explainer describes how to read the chart', async ({ page }) => {
  await page.goto('/');
  await page.locator('#explainer-toggle').click();
  await expect(page.locator('.explainer-howto')).toBeVisible();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:e2e`
Expected: FAIL — `#explainer-toggle` not found

- [ ] **Step 3: Implement chart-explainer.mjs**

```javascript
// src/js/chart-explainer.mjs

const EXPLANATIONS = {
  'cohort-line': {
    name: '코호트 추세선 (Line Chart / Bump Chart)',
    howto: 'X축은 선거(시간 순), Y축은 득표율(%)입니다. 각 선은 하나의 연령 코호트가 선거마다 특정 정당을 얼마나 지지했는지를 보여줍니다. 선을 따라가면 같은 세대의 투표 성향이 시간에 따라 어떻게 변하는지 확인할 수 있습니다.',
    why: '코호트(동일 세대) 추적에 가장 적합한 차트입니다. 여러 선거에 걸쳐 같은 집단의 변화를 연속적으로 보여주므로, 세대별 정치 성향 변화를 직관적으로 파악할 수 있습니다.'
  },
  'heatmap': {
    name: '히트맵 (Heatmap)',
    howto: '행은 연령대, 열은 정당입니다. 색이 진할수록 득표율이 높습니다. 특정 연령대와 정당의 조합을 한눈에 비교할 수 있습니다.',
    why: '다차원 데이터(연령 × 정당)를 하나의 격자에 압축해서 보여주므로, 전체 구도를 빠르게 파악하는 데 효과적입니다.'
  }
};

export function createChartExplainer(toggleBtn, container) {
  toggleBtn.addEventListener('click', () => {
    const isHidden = container.hidden;
    container.hidden = !isHidden;
    toggleBtn.textContent = isHidden ? '차트 설명 닫기' : '이 차트에 대해';
  });

  function showExplanation(chartType) {
    const info = EXPLANATIONS[chartType];
    if (!info) return;

    container.innerHTML = `
      <div class="explainer-content">
        <h3 class="explainer-chart-name">${info.name}</h3>
        <div class="explainer-howto">
          <h4>읽는 법</h4>
          <p>${info.howto}</p>
        </div>
        <div class="explainer-why">
          <h4>왜 이 차트를 사용하나요?</h4>
          <p>${info.why}</p>
        </div>
      </div>
    `;
  }

  // Default to cohort-line
  showExplanation('cohort-line');

  return { showExplanation };
}
```

- [ ] **Step 4: Add toggle button to index.html header**

In `src/index.html`, add inside `<header>`:
```html
<button id="explainer-toggle" type="button">이 차트에 대해</button>
```

- [ ] **Step 5: Wire into main.mjs**

```javascript
import { createChartExplainer } from './chart-explainer.mjs';

// Inside init():
createChartExplainer(
  document.getElementById('explainer-toggle'),
  document.getElementById('explainer-section')
);
```

- [ ] **Step 6: Add explainer CSS**

Append to `src/styles.css`:
```css
/* Explainer */
#explainer-toggle {
  font-size: 12px; padding: 4px 12px; border-radius: 4px; margin-left: 1rem;
  border: 1px solid var(--border); background: var(--surface); color: var(--text-muted); cursor: pointer;
}
#explainer-toggle:hover { color: var(--accent); border-color: var(--accent); }
#explainer-section { background: var(--surface); border: 1px solid var(--border); border-radius: 8px; padding: 1.5rem; }
.explainer-chart-name { font-size: 16px; color: var(--accent); margin-bottom: 1rem; }
.explainer-howto, .explainer-why { margin-bottom: 1rem; }
.explainer-howto h4, .explainer-why h4 { font-size: 12px; color: var(--text-muted); margin-bottom: 0.25rem; }
.explainer-howto p, .explainer-why p { font-size: 13px; line-height: 1.6; }
```

- [ ] **Step 7: Run E2E tests to verify pass**

Run: `npm run test:e2e`
Expected: All explainer tests PASS

- [ ] **Step 8: Commit**

```bash
git add src/js/chart-explainer.mjs src/index.html src/js/main.mjs src/styles.css
git commit -m "feat(election-viz): chart explainer panel with type descriptions"
```

---

## Task 9: Data Download Script

**Files:**
- Create: `scripts/fetch-nec-data.mjs`
- Create: `scripts/normalize-nec-data.mjs`

- [ ] **Step 1: Write failing unit test for normalizer**

```javascript
// tests/unit/normalize.test.mjs
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:unit`
Expected: FAIL — module not found

- [ ] **Step 3: Implement normalize-nec-data.mjs**

```javascript
// scripts/normalize-nec-data.mjs
import { readFileSync, writeFileSync, readdirSync, mkdirSync, existsSync } from 'node:fs';
import { join, basename } from 'node:path';

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

  const outputLines = [headers.join(',')];
  rows.forEach(row => {
    outputLines.push(headers.map(h => row[h]).join(','));
  });

  const dir = join(outputPath, '..');
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  writeFileSync(outputPath, outputLines.join('\n'), 'utf-8');
  return rows.length;
}
```

- [ ] **Step 4: Run unit test to verify pass**

Run: `npm run test:unit`
Expected: All normalize tests PASS

- [ ] **Step 5: Implement fetch-nec-data.mjs (scaffold)**

```javascript
// scripts/fetch-nec-data.mjs
/**
 * 선관위 공공데이터 일괄 다운로드 스크립트.
 *
 * Usage: node scripts/fetch-nec-data.mjs [--election-type presidential|assembly|local|byelection]
 *
 * Downloads from NEC open data portal and saves to 보관함/다운로드/nec.go.kr/
 * Then normalizes into data/elections/
 */
import { mkdirSync, existsSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(import.meta.dirname, '..');
const DOWNLOAD_DIR = join(ROOT, '보관함', '다운로드', 'nec.go.kr');
const OUTPUT_DIR = join(ROOT, 'data', 'elections');

if (!existsSync(DOWNLOAD_DIR)) mkdirSync(DOWNLOAD_DIR, { recursive: true });
if (!existsSync(OUTPUT_DIR)) mkdirSync(OUTPUT_DIR, { recursive: true });

console.log('선관위 데이터 다운로드 스크립트');
console.log(`다운로드 경로: ${DOWNLOAD_DIR}`);
console.log(`출력 경로: ${OUTPUT_DIR}`);
console.log('');
console.log('TODO: 선관위 공공데이터 API 또는 포털에서 데이터를 다운로드합니다.');
console.log('실제 API 엔드포인트와 인증 방식은 선관위 Open API 문서를 참조하세요.');
console.log('다운로드 후 normalize-nec-data.mjs를 실행하여 정규화합니다.');
```

- [ ] **Step 6: Commit**

```bash
git add scripts/fetch-nec-data.mjs scripts/normalize-nec-data.mjs tests/unit/normalize.test.mjs
git commit -m "feat(election-viz): data pipeline scripts (fetch + normalize)"
```

---

## Task 10: Integration + Polish + Final Tests

**Files:**
- Modify: `src/js/main.mjs` (final wiring)
- Modify: `src/index.html` (responsive meta)
- Create: `README.md` (in src/ — usage)

- [ ] **Step 1: Write integration E2E test**

```javascript
// tests/e2e/integration.spec.mjs
import { test, expect } from '@playwright/test';

test('full flow: load → click timeline → filter → see chart → click point → detail', async ({ page }) => {
  await page.goto('/');

  // Timeline loads
  await page.waitForSelector('.timeline-point');
  await expect(page.locator('.timeline-point')).toHaveCount(7);

  // Click an election
  await page.locator('.timeline-point').nth(3).click();
  await expect(page.locator('.timeline-point').nth(3)).toHaveClass(/active/);

  // Chart renders
  await page.waitForSelector('.cohort-line');

  // Change region filter
  await page.locator('#region-filters .filter-btn:has-text("서울")').click();
  await expect(page.locator('#region-filters .filter-btn:has-text("서울")')).toHaveClass(/active/);

  // Click a chart point
  await page.waitForSelector('.cohort-point');
  await page.locator('.cohort-point').first().click();
  await expect(page.locator('#detail-panel')).toBeVisible();

  // Add an event marker
  await page.locator('.event-add-btn').click();
  await page.locator('.event-date-input').fill('2021-12-01');
  await page.locator('.event-name-input').fill('테스트 사건');
  await page.locator('.event-submit-btn').click();
  await expect(page.locator('.event-marker-label')).toHaveText('테스트 사건');

  // Toggle explainer
  await page.locator('#explainer-toggle').click();
  await expect(page.locator('#explainer-section')).toBeVisible();
});

test('dashboard is accessible: no images without alt, buttons have text', async ({ page }) => {
  await page.goto('/');
  const imgsWithoutAlt = page.locator('img:not([alt])');
  await expect(imgsWithoutAlt).toHaveCount(0);
  const buttonsWithoutText = page.locator('button:empty');
  await expect(buttonsWithoutText).toHaveCount(0);
});
```

- [ ] **Step 2: Run integration test**

Run: `npm run test:e2e`
Expected: If all prior tasks pass, integration test should PASS

- [ ] **Step 3: Add responsive CSS adjustments**

Append to `src/styles.css`:
```css
/* Responsive */
@media (max-width: 900px) {
  #chart-section { grid-template-columns: 1fr; }
  #detail-panel { margin-top: 1rem; }
}
@media (max-width: 600px) {
  main { padding: 0.5rem; }
  .filter-group { gap: 4px; }
  .filter-btn { font-size: 10px; padding: 3px 8px; }
}
```

- [ ] **Step 4: Final commit**

```bash
git add tests/e2e/integration.spec.mjs src/styles.css
git commit -m "feat(election-viz): integration tests and responsive polish"
```

---

## Task 11: Skill + Agent Definitions

**Files:**
- Create: `.agents/skills/fetch-nec-data/SKILL.md`
- Create: `.agents/skills/election-viz/SKILL.md`

- [ ] **Step 1: Create fetch-nec-data skill**

```markdown
---
name: fetch-nec-data
description: 선관위 API/포털에서 선거 데이터 일괄 다운로드 + 정규화
---

# fetch-nec-data

선관위 공공데이터를 일괄 다운로드하고 정규화합니다.

## 사용법

1. `node scripts/fetch-nec-data.mjs` — 선관위 포털에서 데이터 다운로드
2. `node scripts/normalize-nec-data.mjs` — 원본 CSV를 정규 구조로 변환

## 출력 경로

- 원본: `보관함/다운로드/nec.go.kr/`
- 정규화: `data/elections/`

## 주의사항

- robots.txt 및 rate limit (1 req/sec) 준수
- 원본 파일은 수정/삭제 금지
- `.meta.json` 에 수집 시간·SHA-256 기록 필수
```

- [ ] **Step 2: Create election-viz skill**

```markdown
---
name: election-viz
description: 선거 시각화 대시보드 로컬 프리뷰 기동 및 검증
---

# election-viz

선거 시각화 대시보드를 로컬에서 서빙하고 검증합니다.

## 사용법

1. `npm run serve` — http://localhost:8080 에서 대시보드 서빙
2. `npm run test:e2e` — Playwright E2E 테스트 실행
3. `npm run test:unit` — 데이터 로직 유닛 테스트

## 전제조건

- `data/elections/meta.json` 이 존재해야 함
- 최소 1개 선거 CSV 파일이 `data/elections/` 아래에 있어야 함

## 검증 체크리스트

- [ ] 타임라인에 선거 포인트가 렌더됨
- [ ] 필터 변경 시 차트 갱신됨
- [ ] 추세선 포인트 클릭 시 디테일 패널 표시됨
- [ ] 사건 추가/삭제 동작
- [ ] 차트 설명 토글 동작
```

- [ ] **Step 3: Commit**

```bash
git add .agents/skills/fetch-nec-data/ .agents/skills/election-viz/
git commit -m "feat(election-viz): add fetch-nec-data and election-viz skills"
```

---

## Summary

| Task | Component | Tests |
|------|-----------|-------|
| 1 | Project scaffold | Smoke E2E |
| 2 | Data loader | 5 unit tests |
| 3 | Timeline | 5 E2E tests |
| 4 | Filter UI | 4 E2E tests |
| 5 | Cohort chart | 4 E2E tests |
| 6 | Detail panel | 5 E2E tests |
| 7 | Event markers | 3 unit + 4 E2E |
| 8 | Chart explainer | 2 E2E tests |
| 9 | Data pipeline | 3 unit tests |
| 10 | Integration | 2 E2E tests |
| 11 | Skills | — |

**Total: 11 tasks, ~37 tests (10 unit + 27 E2E)**
