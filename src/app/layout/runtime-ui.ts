import type { Panel } from '@/components';
import type { PanelConfig } from '@/types';

interface ApplyPanelSettingsFlowOptions {
  panelSettings: Record<string, PanelConfig>;
  panels: Record<string, Panel>;
  mapSectionEl: HTMLElement | null;
}

export function applyPanelSettingsFlow(options: ApplyPanelSettingsFlowOptions): void {
  Object.entries(options.panelSettings).forEach(([key, config]) => {
    if (key === 'map') {
      options.mapSectionEl?.classList.toggle('hidden', !config.enabled);
      return;
    }
    options.panels[key]?.toggle(config.enabled);
  });
}

export function updateUtcClockFlow(timeDisplayEl: HTMLElement | null): void {
  if (!timeDisplayEl) return;
  const now = new Date();
  timeDisplayEl.textContent = `${now.toUTCString().split(' ')[4]} UTC`;
}
