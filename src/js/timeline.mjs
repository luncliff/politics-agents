// src/js/timeline.mjs
import * as d3 from 'd3';

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
