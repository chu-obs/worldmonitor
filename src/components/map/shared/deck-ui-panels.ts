import type { MapLayers } from '@/types';
import { getDeckLayerHelpContent } from '../layers/deck-layer-help-content';
import { getDeckLayerToggleConfig } from '../layers/deck-layer-toggle-config';
import { getDeckLegendConfig } from '../layers/deck-legend-config';

export interface DeckLayerTogglePanelOptions {
  variant: string;
  layers: MapLayers;
  onLayerToggle: (layer: keyof MapLayers, enabled: boolean) => void;
  onHelpToggle: () => void;
}

export function createDeckLayerTogglePanel(options: DeckLayerTogglePanelOptions): HTMLDivElement {
  const toggles = document.createElement('div');
  toggles.className = 'layer-toggles deckgl-layer-toggles';

  const layerConfig = getDeckLayerToggleConfig(options.variant);

  toggles.innerHTML = `
    <div class="toggle-header">
      <span>Layers</span>
      <button class="layer-help-btn" title="Layer Guide">?</button>
      <button class="toggle-collapse">&#9660;</button>
    </div>
    <div class="toggle-list">
      ${layerConfig.map(({ key, label, icon }) => `
        <label class="layer-toggle" data-layer="${key}">
          <input type="checkbox" ${options.layers[key as keyof MapLayers] ? 'checked' : ''}>
          <span class="toggle-icon">${icon}</span>
          <span class="toggle-label">${label}</span>
        </label>
      `).join('')}
    </div>
  `;

  toggles.addEventListener('change', (event) => {
    const input = event.target as HTMLInputElement;
    if (!input || input.tagName !== 'INPUT') return;
    const layer = input.closest('.layer-toggle')?.getAttribute('data-layer') as keyof MapLayers | null;
    if (!layer) return;
    options.onLayerToggle(layer, input.checked);
  });

  toggles.querySelector('.layer-help-btn')?.addEventListener('click', options.onHelpToggle);

  const collapseBtn = toggles.querySelector('.toggle-collapse');
  const toggleList = toggles.querySelector('.toggle-list');
  collapseBtn?.addEventListener('click', () => {
    toggleList?.classList.toggle('collapsed');
    if (collapseBtn instanceof HTMLElement) {
      collapseBtn.innerHTML = toggleList?.classList.contains('collapsed') ? '&#9654;' : '&#9660;';
    }
  });

  return toggles;
}

export function toggleDeckLayerHelpPopup(container: HTMLElement, variant: string): void {
  const existing = container.querySelector('.layer-help-popup');
  if (existing) {
    existing.remove();
    return;
  }

  const popup = document.createElement('div');
  popup.className = 'layer-help-popup';
  popup.innerHTML = getDeckLayerHelpContent(variant);

  popup.querySelector('.layer-help-close')?.addEventListener('click', () => popup.remove());

  const content = popup.querySelector('.layer-help-content');
  if (content) {
    content.addEventListener('wheel', (event) => event.stopPropagation(), { passive: false });
    content.addEventListener('touchmove', (event) => event.stopPropagation(), { passive: false });
  }

  setTimeout(() => {
    const closeHandler = (event: MouseEvent) => {
      if (!popup.contains(event.target as Node)) {
        popup.remove();
        document.removeEventListener('click', closeHandler);
      }
    };
    document.addEventListener('click', closeHandler);
  }, 100);

  container.appendChild(popup);
}

function renderLegendShape(shape: 'circle' | 'triangle' | 'square' | 'hexagon', color: string): string {
  switch (shape) {
    case 'circle':
      return `<svg width="12" height="12" viewBox="0 0 12 12"><circle cx="6" cy="6" r="5" fill="${color}"/></svg>`;
    case 'triangle':
      return `<svg width="12" height="12" viewBox="0 0 12 12"><polygon points="6,1 11,10 1,10" fill="${color}"/></svg>`;
    case 'square':
      return `<svg width="12" height="12" viewBox="0 0 12 12"><rect x="1" y="1" width="10" height="10" rx="1" fill="${color}"/></svg>`;
    case 'hexagon':
      return `<svg width="12" height="12" viewBox="0 0 12 12"><polygon points="6,1 10.5,3.5 10.5,8.5 6,11 1.5,8.5 1.5,3.5" fill="${color}"/></svg>`;
    default:
      return '';
  }
}

export function createDeckLegendElement(variant: string): HTMLDivElement {
  const legend = document.createElement('div');
  legend.className = 'map-legend deckgl-legend';

  const legendItems = getDeckLegendConfig(variant).map((item) => ({
    shape: renderLegendShape(item.shape, item.color),
    label: item.label,
  }));

  legend.innerHTML = `
    <span class="legend-label-title">LEGEND</span>
    ${legendItems.map(({ shape, label }) => `<span class="legend-item">${shape}<span class="legend-label">${label}</span></span>`).join('')}
  `;

  return legend;
}

export function createDeckTimestampElement(): HTMLDivElement {
  const timestamp = document.createElement('div');
  timestamp.className = 'deckgl-timestamp';
  timestamp.id = 'deckglTimestamp';
  return timestamp;
}

export function updateDeckTimestampElement(container: HTMLElement): void {
  const el = container.querySelector('#deckglTimestamp');
  if (!(el instanceof HTMLElement)) return;
  const now = new Date();
  el.textContent = `${now.toUTCString().replace('GMT', 'UTC')}`;
}
