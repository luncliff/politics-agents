// src/js/chart-explainer.mjs

const EXPLANATIONS = {
  'cohort-line': {
    name: '코호트 추세선 (꺾은선 그래프 / Line Chart)',
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
  let isVisible = false;

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

  toggleBtn.addEventListener('click', () => {
    isVisible = !isVisible;
    container.hidden = !isVisible;
    toggleBtn.textContent = isVisible ? '차트 설명 닫기' : '이 차트에 대해';
  });

  // Pre-populate with cohort-line explanation (hidden until toggled)
  showExplanation('cohort-line');

  return { showExplanation };
}
