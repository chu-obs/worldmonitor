import type { MapLayers, Monitor, PanelConfig } from '@/types';
import type { ParsedMapUrlState } from '@/utils';
import type { MapContainer, NewsPanel, Panel } from '@/components';
import { buildAppShellHtml } from '@/app/layout/shell-template';
import { renderPanelTogglesFlow } from '@/app/layout/panel-settings';
import { applyPanelSettingsFlow, updateUtcClockFlow } from '@/app/layout/runtime-ui';
import { bootstrapPanelsFlow } from '@/app/panels/bootstrap';
import { mountPanelsInGridFlow } from '@/app/panels/panel-grid';
import { applyInitialUrlStateFlow } from '@/app/state/url-controls';

interface RenderLayoutRuntimeFlowOptions {
  container: HTMLElement;
  siteVariant: string;
  appVersion: string;
  panelOrderKey: string;
  isMobile: boolean;
  mapLayers: MapLayers;
  panelSettings: Record<string, PanelConfig>;
  initialUrlState: ParsedMapUrlState | null;
  panels: Record<string, Panel>;
  newsPanels: Record<string, NewsPanel>;
  monitors: Monitor[];
  onMonitorsChanged: (monitors: Monitor[]) => void;
  attachRelatedAssetHandlers: (panel: NewsPanel, map: MapContainer) => void;
  onShareStory: (countryCode: string, countryName: string) => void;
  onLayersResolved: (layers: MapLayers) => void;
}

interface RenderLayoutRuntimeFlowResult {
  map: MapContainer;
  timeIntervalId: ReturnType<typeof setInterval>;
}

export function renderLayoutRuntimeFlow(
  options: RenderLayoutRuntimeFlowOptions
): RenderLayoutRuntimeFlowResult {
  options.container.innerHTML = buildAppShellHtml({
    siteVariant: options.siteVariant,
    appVersion: options.appVersion,
  });

  const panelsGrid = document.getElementById('panelsGrid')!;
  const mapContainer = document.getElementById('mapContainer') as HTMLElement;

  const map = bootstrapPanelsFlow({
    mapContainer,
    isMobile: options.isMobile,
    mapLayers: options.mapLayers,
    panels: options.panels,
    newsPanels: options.newsPanels,
    monitors: options.monitors,
    onMonitorsChanged: options.onMonitorsChanged,
    attachRelatedAssetHandlers: options.attachRelatedAssetHandlers,
    onShareStory: options.onShareStory,
  });

  mountPanelsInGridFlow({
    panelOrderKey: options.panelOrderKey,
    panels: options.panels,
    panelsGrid,
  });

  applyPanelSettingsFlow({
    panelSettings: options.panelSettings,
    panels: options.panels,
    mapSectionEl: document.getElementById('mapSection') as HTMLElement | null,
  });

  applyInitialUrlStateFlow({
    initialUrlState: options.initialUrlState,
    map,
    regionSelect: document.getElementById('regionSelect') as HTMLSelectElement | null,
    onLayersResolved: options.onLayersResolved,
  });

  renderPanelTogglesFlow({
    panelSettings: options.panelSettings,
    onApplyPanelSettings: () => {
      applyPanelSettingsFlow({
        panelSettings: options.panelSettings,
        panels: options.panels,
        mapSectionEl: document.getElementById('mapSection') as HTMLElement | null,
      });
    },
  });

  updateUtcClockFlow(document.getElementById('timeDisplay') as HTMLElement | null);
  const timeIntervalId = setInterval(() => {
    updateUtcClockFlow(document.getElementById('timeDisplay') as HTMLElement | null);
  }, 1000);

  return {
    map,
    timeIntervalId,
  };
}
