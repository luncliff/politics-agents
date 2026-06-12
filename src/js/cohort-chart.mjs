// src/js/cohort-chart.mjs
import * as d3 from 'd3';

const PARTY_COLORS = {};

export function setPartyColors(partyColorMap) {
  Object.assign(PARTY_COLORS, partyColorMap);
}

export function createCohortChart(container, onPointClick) {
  const el = d3.select(container);
  el.selectAll('*').remove();

  const margin = { top: 20, right: 120, bottom: 40, left: 50 };
  const width = Math.max(container.getBoundingClientRect().width - margin.left - margin.right, 300);
  const height = 340;

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
    if (!electionDatasets || electionDatasets.length === 0) return;

    const elections = electionDatasets.map(d => d.election);

    const xScale = d3.scalePoint()
      .domain(elections.map(e => e.id))
      .range([0, width])
      .padding(0.2);

    const yScale = d3.scaleLinear()
      .domain([0, 100])
      .range([height, 0]);

    g.select('.x-axis').call(
      d3.axisBottom(xScale).tickFormat(id => {
        const e = elections.find(el => el.id === id);
        return e ? e.date.slice(0, 4) : id;
      })
    );
    g.select('.y-axis').call(
      d3.axisLeft(yScale).tickFormat(d => d + '%')
    );

    const cohortData = buildCohortData(electionDatasets, regions, ageGroups);

    const line = d3.line()
      .x(d => xScale(d.electionId))
      .y(d => yScale(d.voteShare))
      .defined(d => d.voteShare !== null && !isNaN(d.voteShare))
      .curve(d3.curveMonotoneX);

    // Lines
    const linesLayer = g.select('.lines-layer');
    const lineSelection = linesLayer.selectAll('.cohort-line').data(cohortData, d => `${d.party}-${d.ageGroup}`);
    lineSelection.exit().remove();
    lineSelection.enter()
      .append('path')
      .attr('class', 'cohort-line')
      .merge(lineSelection)
      .attr('d', d => line(d.points))
      .attr('fill', 'none')
      .attr('stroke', d => PARTY_COLORS[d.party] || '#888')
      .attr('stroke-width', 2)
      .attr('opacity', 0.8)
      .attr('data-age-group', d => d.ageGroup)
      .attr('data-party', d => d.party);

    // Points
    const pointsLayer = g.select('.points-layer');
    const allPoints = cohortData.flatMap(c =>
      c.points.map(p => ({ ...p, party: c.party, ageGroup: c.ageGroup, key: `${c.party}-${c.ageGroup}-${p.electionId}` }))
    );
    const ptSelection = pointsLayer.selectAll('.cohort-point').data(allPoints, d => d.key);
    ptSelection.exit().remove();
    ptSelection.enter()
      .append('circle')
      .attr('class', 'cohort-point')
      .merge(ptSelection)
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

  return { update, g };
}

function buildCohortData(electionDatasets, regions, ageGroups) {
  const cohorts = [];
  const partiesSet = new Set();
  const agesSet = new Set();

  for (const ds of electionDatasets) {
    let rows = ds.rows;
    if (!regions.includes('전국')) {
      rows = rows.filter(r => regions.includes(r.region));
    }
    rows.forEach(r => { partiesSet.add(r.party); agesSet.add(r.age_group); });
  }

  if (partiesSet.size === 0) return [];

  const targetAges = ageGroups.includes('전체') ? [...agesSet] : ageGroups.filter(a => agesSet.has(a));

  for (const party of partiesSet) {
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
          const voteShare = totalVoters > 0 ? Math.round((totalVotes / totalVoters) * 1000) / 10 : 0;
          points.push({ electionId: ds.election.id, voteShare });
        }
      }
      if (points.length > 0) {
        cohorts.push({ party, ageGroup: age, points });
      }
    }
  }

  return cohorts;
}
