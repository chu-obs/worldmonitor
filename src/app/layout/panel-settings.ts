import { STORAGE_KEYS } from '@/config';
import { saveToStorage } from '@/utils';
import type { PanelConfig } from '@/types';

interface RenderPanelTogglesFlowOptions {
  panelSettings: Record<string, PanelConfig>;
  onApplyPanelSettings: () => void;
}

export function renderPanelTogglesFlow(options: RenderPanelTogglesFlowOptions): void {
  const container = document.getElementById('panelToggles');
  if (!container) return;

  container.innerHTML = Object.entries(options.panelSettings)
    .map(
      ([key, panel]) => `
        <div class="panel-toggle-item ${panel.enabled ? 'active' : ''}" data-panel="${key}">
          <div class="panel-toggle-checkbox">${panel.enabled ? '✓' : ''}</div>
          <span class="panel-toggle-label">${panel.name}</span>
        </div>
      `
    )
    .join('');

  container.querySelectorAll('.panel-toggle-item').forEach((item) => {
    item.addEventListener('click', () => {
      const panelKey = (item as HTMLElement).dataset.panel;
      if (!panelKey) return;

      const config = options.panelSettings[panelKey];
      if (!config) return;

      config.enabled = !config.enabled;
      saveToStorage(STORAGE_KEYS.panels, options.panelSettings);
      renderPanelTogglesFlow(options);
      options.onApplyPanelSettings();
    });
  });
}
