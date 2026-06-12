// src/js/detail-panel.mjs
import * as d3 from 'd3';

export function createDetailPanel(container) {
  const panel = d3.select(container);

  function show(pointData, electionRows) {
    panel.attr('hidden', null);
    panel.selectAll('*').remove();

    // Close button
    panel.append('button')
      .attr('class', 'detail-close')
      .attr('type', 'button')
      .text('✕')
      .on('click', () => hide());

    // Title
    panel.append('h3')
      .attr('class', 'detail-title')
      .text(`${pointData.ageGroup} · ${pointData.party}`);

    // Summary stats
    const matching = electionRows.filter(r =>
      r.age_group === pointData.ageGroup && r.party === pointData.party
    );
    const totalVotes = matching.reduce((s, r) => s + r.votes, 0);
    const totalVoters = matching.reduce((s, r) => s + r.total_voters, 0);
    const avgTurnout = matching.length > 0
      ? (matching.reduce((s, r) => s + r.turnout, 0) / matching.length).toFixed(1)
      : '—';
    const voteSharePct = totalVoters > 0
      ? (totalVotes / totalVoters * 100).toFixed(1)
      : '—';

    const summary = panel.append('div').attr('class', 'detail-summary');
    summary.append('div').html(`<span class="detail-label">득표수</span><strong>${totalVotes.toLocaleString()}</strong>`);
    summary.append('div').html(`<span class="detail-label">유권자수</span><strong>${totalVoters.toLocaleString()}</strong>`);
    summary.append('div').html(`<span class="detail-label">투표율</span><strong>${avgTurnout}%</strong>`);
    summary.append('div').html(`<span class="detail-label">득표율</span><strong>${voteSharePct}%</strong>`);

    // Heatmap
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
      tr.append('td').attr('class', 'age-label').text(age);
      parties.forEach(party => {
        const m = rows.filter(r => r.age_group === age && r.party === party);
        const votes = m.reduce((s, r) => s + r.votes, 0);
        const voters = m.reduce((s, r) => s + r.total_voters, 0);
        const share = voters > 0 ? (votes / voters * 100) : null;
        const shareStr = share !== null ? share.toFixed(1) + '%' : '—';

        const td = tr.append('td')
          .attr('class', 'heatmap-cell')
          .text(shareStr);

        if (share !== null) {
          const intensity = Math.min(share / 70, 1);
          td.style('background-color', `rgba(79,195,247,${intensity * 0.55})`);
        }
        if (age === highlight.ageGroup && party === highlight.party) {
          td.classed('highlighted', true);
        }
      });
    });
  }

  return { show, hide };
}
