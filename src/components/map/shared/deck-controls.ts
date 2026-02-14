import type { GlobalMapView, MapTimeRange } from './types';

export interface DeckControlsCallbacks {
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetView: () => void;
  onViewChange: (view: GlobalMapView) => void;
}

export interface DeckTimeSliderCallbacks {
  onTimeRangeChange: (range: MapTimeRange) => void;
}

const VIEW_OPTIONS = [
  { value: 'global', label: 'Global' },
  { value: 'america', label: 'Americas' },
  { value: 'mena', label: 'MENA' },
  { value: 'eu', label: 'Europe' },
  { value: 'asia', label: 'Asia' },
  { value: 'latam', label: 'Latin America' },
  { value: 'africa', label: 'Africa' },
  { value: 'oceania', label: 'Oceania' },
] as const;

const TIME_RANGE_OPTIONS: Array<{ range: MapTimeRange; label: string }> = [
  { range: '1h', label: '1h' },
  { range: '6h', label: '6h' },
  { range: '24h', label: '24h' },
  { range: '48h', label: '48h' },
  { range: '7d', label: '7d' },
  { range: 'all', label: 'All' },
];

export function createDeckControlsElement(
  currentView: GlobalMapView,
  callbacks: DeckControlsCallbacks,
): HTMLDivElement {
  const controls = document.createElement('div');
  controls.className = 'map-controls deckgl-controls';
  controls.innerHTML = `
    <div class="zoom-controls">
      <button class="map-btn zoom-in" title="Zoom In">+</button>
      <button class="map-btn zoom-out" title="Zoom Out">-</button>
      <button class="map-btn zoom-reset" title="Reset View">&#8962;</button>
    </div>
    <div class="view-selector">
      <select class="view-select">
        ${VIEW_OPTIONS.map(option => `<option value="${option.value}">${option.label}</option>`).join('')}
      </select>
    </div>
  `;

  controls.addEventListener('click', (event) => {
    const target = event.target as HTMLElement;
    if (target.classList.contains('zoom-in')) callbacks.onZoomIn();
    else if (target.classList.contains('zoom-out')) callbacks.onZoomOut();
    else if (target.classList.contains('zoom-reset')) callbacks.onResetView();
  });

  const viewSelect = controls.querySelector('.view-select');
  if (viewSelect instanceof HTMLSelectElement) {
    viewSelect.value = currentView;
    viewSelect.addEventListener('change', () => {
      callbacks.onViewChange(viewSelect.value as GlobalMapView);
    });
  }

  return controls;
}

export function createDeckTimeSliderElement(
  currentRange: MapTimeRange,
  callbacks: DeckTimeSliderCallbacks,
): HTMLDivElement {
  const slider = document.createElement('div');
  slider.className = 'time-slider deckgl-time-slider';
  slider.innerHTML = `
    <div class="time-options">
      ${TIME_RANGE_OPTIONS.map(option => `
        <button
          class="time-btn ${currentRange === option.range ? 'active' : ''}"
          data-range="${option.range}"
        >${option.label}</button>
      `).join('')}
    </div>
  `;

  slider.addEventListener('click', (event) => {
    const target = (event.target as HTMLElement).closest('.time-btn') as HTMLElement | null;
    if (!target) return;

    const range = target.dataset.range as MapTimeRange | undefined;
    if (!range) return;

    callbacks.onTimeRangeChange(range);
    slider.querySelectorAll('.time-btn').forEach((button) => {
      button.classList.toggle('active', button === target);
    });
  });

  return slider;
}
