import {
  DEFAULT_MAP_LAYERS,
  DEFAULT_PANELS,
  MOBILE_DEFAULT_MAP_LAYERS,
  STORAGE_KEYS,
} from '@/config';
import type { MapLayers, PanelConfig } from '@/types';
import { loadFromStorage } from '@/utils';
import type { ParsedMapUrlState } from '@/utils';
import { resolveInitialUrlState } from './url-bootstrap';

interface InitializeBootstrapSettingsOptions {
  isMobile: boolean;
  panelOrderKey: string;
  siteVariant: string;
  urlSearch: string;
}

interface BootstrapSettingsState {
  mapLayers: MapLayers;
  panelSettings: Record<string, PanelConfig>;
  initialUrlState: ParsedMapUrlState;
  disabledSources: Set<string>;
}

function runPanelOrderMigration(panelOrderKey: string): void {
  const migrationKey = 'worldmonitor-panel-order-v1.9';
  if (localStorage.getItem(migrationKey)) return;

  const savedOrder = localStorage.getItem(panelOrderKey);
  if (savedOrder) {
    try {
      const order: string[] = JSON.parse(savedOrder);
      const priorityPanels = ['insights', 'strategic-posture', 'cii', 'strategic-risk'];
      const filtered = order.filter((key) => !priorityPanels.includes(key) && key !== 'live-news');
      const liveNewsIndex = order.indexOf('live-news');
      const newOrder = liveNewsIndex !== -1 ? ['live-news'] : [];
      newOrder.push(...priorityPanels.filter((panel) => order.includes(panel)));
      newOrder.push(...filtered);
      localStorage.setItem(panelOrderKey, JSON.stringify(newOrder));
      console.log('[App] Migrated panel order to v1.8 layout');
    } catch {
      // Invalid saved order, skip migration.
    }
  }

  localStorage.setItem(migrationKey, 'done');
}

function runTechInsightsMigration(panelOrderKey: string): void {
  const migrationKey = 'worldmonitor-tech-insights-top-v1';
  if (localStorage.getItem(migrationKey)) return;

  const savedOrder = localStorage.getItem(panelOrderKey);
  if (savedOrder) {
    try {
      const order: string[] = JSON.parse(savedOrder);
      const filtered = order.filter((key) => key !== 'insights' && key !== 'live-news');
      const newOrder: string[] = [];
      if (order.includes('live-news')) newOrder.push('live-news');
      if (order.includes('insights')) newOrder.push('insights');
      newOrder.push(...filtered);
      localStorage.setItem(panelOrderKey, JSON.stringify(newOrder));
      console.log('[App] Tech variant: Migrated insights panel to top');
    } catch {
      // Invalid saved order, skip migration.
    }
  }

  localStorage.setItem(migrationKey, 'done');
}

export function initializeBootstrapSettings(
  options: InitializeBootstrapSettingsOptions
): BootstrapSettingsState {
  const defaultLayers = options.isMobile ? MOBILE_DEFAULT_MAP_LAYERS : DEFAULT_MAP_LAYERS;
  const storedVariant = localStorage.getItem('worldmonitor-variant');

  let mapLayers: MapLayers;
  let panelSettings: Record<string, PanelConfig>;

  console.log(`[App] Variant check: stored="${storedVariant}", current="${options.siteVariant}"`);
  if (storedVariant !== options.siteVariant) {
    console.log('[App] Variant changed - resetting to defaults');
    localStorage.setItem('worldmonitor-variant', options.siteVariant);
    localStorage.removeItem(STORAGE_KEYS.mapLayers);
    localStorage.removeItem(STORAGE_KEYS.panels);
    localStorage.removeItem(options.panelOrderKey);
    mapLayers = { ...defaultLayers };
    panelSettings = { ...DEFAULT_PANELS };
  } else {
    mapLayers = loadFromStorage<MapLayers>(STORAGE_KEYS.mapLayers, defaultLayers);
    panelSettings = loadFromStorage<Record<string, PanelConfig>>(STORAGE_KEYS.panels, DEFAULT_PANELS);
    console.log(
      '[App] Loaded panel settings from storage:',
      Object.entries(panelSettings)
        .filter(([_, value]) => !value.enabled)
        .map(([key]) => key)
    );

    runPanelOrderMigration(options.panelOrderKey);
    if (options.siteVariant === 'tech') {
      runTechInsightsMigration(options.panelOrderKey);
    }
  }

  const initialUrlState = resolveInitialUrlState(options.urlSearch, mapLayers, options.siteVariant);
  if (initialUrlState.layers) {
    mapLayers = initialUrlState.layers;
  }

  return {
    mapLayers,
    panelSettings,
    initialUrlState,
    disabledSources: new Set(loadFromStorage<string[]>(STORAGE_KEYS.disabledFeeds, [])),
  };
}
