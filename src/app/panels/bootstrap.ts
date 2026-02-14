import type { MapLayers, Monitor } from '@/types';
import type { MapContainer, NewsPanel, Panel } from '@/components';
import { SITE_VARIANT } from '@/config';
import {
  CORE_NEWS_PANEL_SPECS,
  REGIONAL_NEWS_PANEL_SPECS,
  registerNewsPanels,
  TECH_NEWS_PANEL_SPECS,
} from '@/app/panels/news-panels';
import { initializeMainMap, registerCorePanels } from '@/app/panels/core-panels';
import { registerFullVariantPanels } from '@/app/panels/full-variant-panels';

interface BootstrapPanelsFlowOptions {
  mapContainer: HTMLElement;
  isMobile: boolean;
  mapLayers: MapLayers;
  panels: Record<string, Panel>;
  newsPanels: Record<string, NewsPanel>;
  monitors: Monitor[];
  onMonitorsChanged: (monitors: Monitor[]) => void;
  attachRelatedAssetHandlers: (panel: NewsPanel, map: MapContainer) => void;
  onShareStory: (countryCode: string, countryName: string) => void;
}

export function bootstrapPanelsFlow(options: BootstrapPanelsFlowOptions): MapContainer {
  const map = initializeMainMap({
    container: options.mapContainer,
    isMobile: options.isMobile,
    mapLayers: options.mapLayers,
  });

  registerNewsPanels({
    specs: CORE_NEWS_PANEL_SPECS,
    panels: options.panels,
    newsPanels: options.newsPanels,
    attachRelatedAssetHandlers: (panel) => {
      options.attachRelatedAssetHandlers(panel, map);
    },
  });

  registerNewsPanels({
    specs: TECH_NEWS_PANEL_SPECS,
    panels: options.panels,
    newsPanels: options.newsPanels,
    attachRelatedAssetHandlers: (panel) => {
      options.attachRelatedAssetHandlers(panel, map);
    },
  });

  registerNewsPanels({
    specs: REGIONAL_NEWS_PANEL_SPECS,
    panels: options.panels,
    newsPanels: options.newsPanels,
    attachRelatedAssetHandlers: (panel) => {
      options.attachRelatedAssetHandlers(panel, map);
    },
  });

  registerCorePanels({
    panels: options.panels,
    monitors: options.monitors,
    onMonitorsChanged: options.onMonitorsChanged,
  });

  if (SITE_VARIANT === 'full') {
    registerFullVariantPanels({
      panels: options.panels,
      onShareStory: options.onShareStory,
      onCenterMap: (lat, lon, zoom) => {
        map.setCenter(lat, lon, zoom);
      },
    });
  }

  return map;
}
