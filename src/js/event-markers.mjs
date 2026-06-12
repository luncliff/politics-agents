// src/js/event-markers.mjs

let events = [];
let nextId = 1;

export function addEvent(date, name) {
  const ev = { id: String(nextId++), date, name };
  events.push(ev);
  events.sort((a, b) => a.date.localeCompare(b.date));
  _saveToStorage();
  return ev;
}

export function removeEvent(id) {
  events = events.filter(e => e.id !== id);
  _saveToStorage();
}

export function getEvents() {
  return [...events];
}

export function clearEvents() {
  events = [];
  nextId = 1;
  _saveToStorage();
}

function _saveToStorage() {
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

export function createEventMarkerUI(container, getTimeScale, getChartG, onUpdate) {
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
    const timeScale = getTimeScale ? getTimeScale() : null;
    const chartG = getChartG ? getChartG() : null;
    if (!chartG || !timeScale) return;

    const layer = chartG.select('.event-lines-layer');
    layer.selectAll('*').remove();

    const currentEvents = getEvents();
    const svgHeight = 360;

    currentEvents.forEach(ev => {
      const x = interpolateX(ev.date, timeScale);
      if (x === null) return;

      const g = layer.append('g').attr('class', 'event-marker-group');
      g.append('line')
        .attr('class', 'event-marker-line')
        .attr('x1', x).attr('x2', x)
        .attr('y1', 0).attr('y2', svgHeight)
        .attr('stroke', '#ffd54f')
        .attr('stroke-width', 1)
        .attr('stroke-dasharray', '4,3')
        .attr('opacity', 0.7);

      g.append('text')
        .attr('class', 'event-marker-label')
        .attr('x', x + 4)
        .attr('y', 14)
        .attr('fill', '#ffd54f')
        .attr('font-size', '10px')
        .text(ev.name);

      g.append('rect')
        .attr('class', 'event-marker-delete')
        .attr('x', x - 6).attr('y', -6)
        .attr('width', 12).attr('height', 12)
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

function interpolateX(dateStr, timeScale) {
  const range = timeScale.range();
  const domain = timeScale.domain();
  if (domain.length < 2) return (range[0] + range[1]) / 2;

  // Each domain point has a known x. Linearly interpolate between neighbors.
  // timeScale is a scalePoint — we need election dates to interpolate.
  // For now, place at the midpoint of the range.
  return (range[0] + range[1]) / 2;
}
