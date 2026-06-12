// src/js/main.mjs
import { parseCsv } from './data-loader.mjs';
import { createTimeline } from './timeline.mjs';
import { createFilters } from './filters.mjs';

const DATA_BASE = 'data/elections';

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
