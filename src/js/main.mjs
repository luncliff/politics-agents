// src/js/main.mjs
import { parseCsv } from './data-loader.mjs';
import { createTimeline } from './timeline.mjs';
import { createFilters } from './filters.mjs';
import { createCohortChart, setPartyColors } from './cohort-chart.mjs';
import { createDetailPanel } from './detail-panel.mjs';

const DATA_BASE = 'data/elections';

async function init() {
  const metaResp = await fetch(`${DATA_BASE}/meta.json`);
  const meta = await metaResp.json();

  const datasets = [];
  for (const election of meta.elections) {
    try {
      const path = `${DATA_BASE}/${election.type}/${election.date.slice(0, 4)}.csv`;
      const resp = await fetch(path);
      if (resp.ok) {
        const text = await resp.text();
        datasets.push({ election, rows: parseCsv(text) });
      }
    } catch (e) { /* skip missing */ }
  }

  setPartyColors({
    '더불어민주당': '#1565c0',
    '국민의힘': '#ef5350',
  });

  let filterState = { regions: ['전국'], ageGroups: ['전체'], parties: ['전체'] };

  const detailPanel = createDetailPanel(document.getElementById('detail-panel'));

  const chartContainer = document.getElementById('cohort-chart');
  const chart = createCohortChart(chartContainer, (pointData) => {
    const ds = datasets.find(d => d.election.id === pointData.electionId);
    if (ds) detailPanel.show(pointData, ds.rows);
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

  updateChart();
}

init();
