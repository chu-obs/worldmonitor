import {
  CommoditiesPanel,
  CryptoPanel,
  EconomicPanel,
  ETFFlowsPanel,
  HeatmapPanel,
  InsightsPanel,
  LiveNewsPanel,
  MacroSignalsPanel,
  MapContainer,
  MarketPanel,
  MonitorPanel,
  PredictionPanel,
  ServiceStatusPanel,
  StablecoinPanel,
  TechEventsPanel,
  TechReadinessPanel,
  type Panel,
} from '@/components';
import type { MapLayers, Monitor } from '@/types';

interface InitializeMainMapOptions {
  container: HTMLElement;
  isMobile: boolean;
  mapLayers: MapLayers;
}

export function initializeMainMap(options: InitializeMainMapOptions): MapContainer {
  const map = new MapContainer(options.container, {
    zoom: options.isMobile ? 2.5 : 1.0,
    pan: { x: 0, y: 0 },
    view: options.isMobile ? 'mena' : 'global',
    layers: options.mapLayers,
    timeRange: '7d',
  });

  map.initEscalationGetters();
  return map;
}

interface RegisterCorePanelsOptions {
  panels: Record<string, Panel>;
  monitors: Monitor[];
  onMonitorsChanged: (monitors: Monitor[]) => void;
}

export function registerCorePanels(options: RegisterCorePanelsOptions): void {
  options.panels['heatmap'] = new HeatmapPanel();
  options.panels['markets'] = new MarketPanel();

  const monitorPanel = new MonitorPanel(options.monitors);
  options.panels['monitors'] = monitorPanel;
  monitorPanel.onChanged((monitors) => {
    options.onMonitorsChanged(monitors);
  });

  options.panels['commodities'] = new CommoditiesPanel();
  options.panels['polymarket'] = new PredictionPanel();
  options.panels['crypto'] = new CryptoPanel();
  options.panels['economic'] = new EconomicPanel();

  options.panels['live-news'] = new LiveNewsPanel();
  options.panels['events'] = new TechEventsPanel('events');
  options.panels['service-status'] = new ServiceStatusPanel();
  options.panels['tech-readiness'] = new TechReadinessPanel();

  options.panels['macro-signals'] = new MacroSignalsPanel();
  options.panels['etf-flows'] = new ETFFlowsPanel();
  options.panels['stablecoins'] = new StablecoinPanel();

  options.panels['insights'] = new InsightsPanel();
}
