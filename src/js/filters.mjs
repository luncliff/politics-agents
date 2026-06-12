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
          // "전국" or "전체" resets to only that selection
          state[stateKey] = [item];
        } else {
          // Remove "전국"/"전체" sentinel from selection
          state[stateKey] = state[stateKey].filter(x => x !== items[0]);
          if (btn.classList.contains('active')) {
            // Deselect this item
            state[stateKey] = state[stateKey].filter(x => x !== item);
            // If nothing selected, revert to sentinel
            if (state[stateKey].length === 0) state[stateKey] = [items[0]];
          } else {
            // Select this item
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
