import type {
  ClusteredEvent,
  MapLayers,
  MarketData,
  NewsItem,
  PredictionMarket,
} from '@/types';
import type { TheaterPostureSummary } from '@/services/military-surge';
import type { IntelligenceCache } from '@/app/state/country-signals';
import type {
  CIIPanel,
  CommoditiesPanel,
  CryptoPanel,
  EconomicPanel,
  HeatmapPanel,
  InsightsPanel,
  MapContainer,
  MarketPanel,
  MonitorPanel,
  NewsPanel,
  Panel,
  PizzIntIndicator,
  PredictionPanel,
  SearchModal,
  SignalModal,
  StatusPanel,
  StrategicPosturePanel,
} from '@/components';
import type { SatelliteFiresPanel } from '@/components/SatelliteFiresPanel';
import { loadNewsRuntimeFlow } from '@/app/data/news-runtime';
import { loadAllDataFlow, loadDataForLayerFlow } from '@/app/data/load-orchestration';
import { registerDefaultRefreshPlan } from '@/app/data/default-refresh-plan';
import type { RefreshScheduler } from '@/app/data/refresh-scheduler';
import { loadMarketsFlow } from '@/app/data/markets-flow';
import { loadPredictionsFlow, loadFirmsDataFlow } from '@/app/data/signals-flow';
import { runCorrelationAnalysisFlow } from '@/app/data/correlation-flow';
import { loadNaturalFlow, loadTechEventsFlow, loadWeatherAlertsFlow } from '@/app/data/environment-flow';
import { loadIntelligenceSignalsFlow } from '@/app/data/intelligence-flow';
import {
  loadAisSignalsLayerFlow,
  loadCableActivityLayerFlow,
  loadFlightDelaysLayerFlow,
  loadOutagesLayerFlow,
  loadProtestsLayerFlow,
  waitForAisDataFlow,
} from '@/app/data/intelligence-layer-flow';
import { loadMilitaryFlow } from '@/app/data/military-flow';
import { loadFredDataFlow, loadGovernmentSpendingFlow, loadOilAnalyticsFlow } from '@/app/data/economic-flow';
import { loadPizzIntFlow } from '@/app/data/pizzint-flow';
import { updateSearchIndexFlow } from '@/app/panels/search-flow';

export interface RuntimeLoaderCoordinator {
  loadAllData: (inFlight: Set<string>, onTechReadiness: () => Promise<void> | void) => Promise<void>;
  loadDataForLayer: (layer: keyof MapLayers, inFlight: Set<string>) => Promise<void>;
  setupRefreshIntervals: (scheduler: RefreshScheduler, getMapLayers: () => MapLayers) => void;
  loadPizzInt: () => Promise<void>;
  loadNews: () => Promise<void>;
  loadMarkets: () => Promise<void>;
  loadPredictions: () => Promise<void>;
  loadNatural: () => Promise<void>;
  loadTechEvents: () => Promise<void>;
  loadWeatherAlerts: () => Promise<void>;
  loadIntelligenceSignals: () => Promise<void>;
  loadOutages: () => Promise<void>;
  loadAisSignals: () => Promise<void>;
  waitForAisData: () => void;
  loadCableActivity: () => Promise<void>;
  loadProtests: () => Promise<void>;
  loadFlightDelays: () => Promise<void>;
  loadMilitary: () => Promise<void>;
  loadFredData: () => Promise<void>;
  loadOilAnalytics: () => Promise<void>;
  loadGovernmentSpending: () => Promise<void>;
  loadFirmsData: () => Promise<void>;
  runCorrelationAnalysis: () => Promise<void>;
  updateMonitorResults: () => void;
  resetIntelligenceCache: () => void;
}

interface RuntimeLoaderCoordinatorOptions {
  siteVariant: string;
  mapFlashCooldownMs: number;
  getMap: () => MapContainer | null;
  getPanels: () => Record<string, Panel>;
  getNewsPanels: () => Record<string, NewsPanel>;
  getStatusPanel: () => StatusPanel | null;
  getSignalModal: () => SignalModal | null;
  getSearchModal: () => SearchModal | null;
  getPizzintIndicator: () => PizzIntIndicator | null;
  getMapLayers: () => MapLayers;
  getDisabledSources: () => Set<string>;
  getAllNews: () => NewsItem[];
  setAllNews: (news: NewsItem[]) => void;
  getInitialLoadComplete: () => boolean;
  setInitialLoadComplete: (isComplete: boolean) => void;
  getMapFlashCache: () => Map<string, number>;
  getLatestPredictions: () => PredictionMarket[];
  setLatestPredictions: (predictions: PredictionMarket[]) => void;
  getLatestMarkets: () => MarketData[];
  setLatestMarkets: (markets: MarketData[]) => void;
  getLatestClusters: () => ClusteredEvent[];
  setLatestClusters: (clusters: ClusteredEvent[]) => void;
  getSeenGeoAlerts: () => Set<string>;
  getIntelligenceCache: () => IntelligenceCache;
  setIntelligenceCache: (cache: IntelligenceCache) => void;
  renderCriticalBanner: (postures: TheaterPostureSummary[]) => void;
}

export function createRuntimeLoaderCoordinator(
  options: RuntimeLoaderCoordinatorOptions
): RuntimeLoaderCoordinator {
  const getPanel = (panelId: string): Panel | undefined => options.getPanels()[panelId];

  const updateMonitorResults = (): void => {
    const monitorPanel = getPanel('monitors') as MonitorPanel | undefined;
    monitorPanel?.renderResults(options.getAllNews());
  };

  const runCorrelationAnalysis = async (): Promise<void> => {
    try {
      const clusters = await runCorrelationAnalysisFlow({
        allNews: options.getAllNews(),
        latestClusters: options.getLatestClusters(),
        latestPredictions: options.getLatestPredictions(),
        latestMarkets: options.getLatestMarkets(),
        seenGeoAlerts: options.getSeenGeoAlerts(),
        signalModal: options.getSignalModal(),
        onClustersUpdated: (updatedClusters) => {
          options.setLatestClusters(updatedClusters);
        },
        onCiiRefresh: () => {
          (getPanel('cii') as CIIPanel | undefined)?.refresh();
        },
      });
      options.setLatestClusters(clusters);
    } catch (error) {
      console.error('[App] Correlation analysis failed:', error);
    }
  };

  const loadPizzInt = async (): Promise<void> => {
    await loadPizzIntFlow({
      pizzintIndicator: options.getPizzintIndicator(),
      statusPanel: options.getStatusPanel(),
    });
  };

  const loadNews = async (): Promise<void> => {
    await loadNewsRuntimeFlow({
      map: options.getMap(),
      newsPanels: options.getNewsPanels(),
      statusPanel: options.getStatusPanel(),
      disabledSources: options.getDisabledSources(),
      initialLoadComplete: options.getInitialLoadComplete(),
      mapFlashCache: options.getMapFlashCache(),
      mapFlashCooldownMs: options.mapFlashCooldownMs,
      updateMonitorResults,
      setAllNews: options.setAllNews,
      setInitialLoadComplete: options.setInitialLoadComplete,
      setLatestClusters: options.setLatestClusters,
      updateInsights: (clusters) => {
        const insightsPanel = getPanel('insights') as InsightsPanel | undefined;
        insightsPanel?.updateInsights(clusters);
      },
      setNewsLocations: (locations) => {
        options.getMap()?.setNewsLocations(locations);
      },
    });
  };

  const loadMarkets = async (): Promise<void> => {
    await loadMarketsFlow({
      marketPanel: getPanel('markets') as MarketPanel,
      heatmapPanel: getPanel('heatmap') as HeatmapPanel,
      commoditiesPanel: getPanel('commodities') as CommoditiesPanel,
      cryptoPanel: getPanel('crypto') as CryptoPanel,
      setLatestMarkets: options.setLatestMarkets,
      setApiStatus: (apiName, payload) => {
        options.getStatusPanel()?.updateApi(apiName, payload);
      },
    });
  };

  const loadPredictions = async (): Promise<void> => {
    await loadPredictionsFlow({
      predictionPanel: (getPanel('polymarket') as PredictionPanel | undefined) ?? null,
      statusPanel: options.getStatusPanel(),
      setLatestPredictions: options.setLatestPredictions,
      runCorrelationAnalysis,
    });
  };

  const loadNatural = async (): Promise<void> => {
    await loadNaturalFlow({
      map: options.getMap(),
      statusPanel: options.getStatusPanel(),
    });
  };

  const loadTechEvents = async (): Promise<void> => {
    await loadTechEventsFlow({
      siteVariant: options.siteVariant,
      techEventsLayerEnabled: options.getMapLayers().techEvents,
      map: options.getMap(),
      statusPanel: options.getStatusPanel(),
      searchModal: options.getSearchModal(),
    });
  };

  const loadWeatherAlerts = async (): Promise<void> => {
    await loadWeatherAlertsFlow({
      map: options.getMap(),
      statusPanel: options.getStatusPanel(),
    });
  };

  const loadIntelligenceSignals = async (): Promise<void> => {
    await loadIntelligenceSignalsFlow({
      mapLayers: options.getMapLayers(),
      intelligenceCache: options.getIntelligenceCache(),
      map: options.getMap(),
      panels: options.getPanels(),
      statusPanel: options.getStatusPanel(),
      signalModal: options.getSignalModal(),
    });
  };

  const loadOutages = async (): Promise<void> => {
    await loadOutagesLayerFlow({
      intelligenceCache: options.getIntelligenceCache(),
      map: options.getMap(),
      statusPanel: options.getStatusPanel(),
    });
  };

  const loadAisSignals = async (): Promise<void> => {
    await loadAisSignalsLayerFlow({
      map: options.getMap(),
      statusPanel: options.getStatusPanel(),
    });
  };

  const waitForAisData = (): void => {
    waitForAisDataFlow({
      map: options.getMap(),
      statusPanel: options.getStatusPanel(),
      loadAisSignals,
    });
  };

  const loadCableActivity = async (): Promise<void> => {
    await loadCableActivityLayerFlow({
      map: options.getMap(),
      statusPanel: options.getStatusPanel(),
    });
  };

  const loadProtests = async (): Promise<void> => {
    await loadProtestsLayerFlow({
      intelligenceCache: options.getIntelligenceCache(),
      map: options.getMap(),
      statusPanel: options.getStatusPanel(),
      ciiPanel: (getPanel('cii') as CIIPanel | undefined) ?? null,
    });
  };

  const loadFlightDelays = async (): Promise<void> => {
    await loadFlightDelaysLayerFlow({
      map: options.getMap(),
      statusPanel: options.getStatusPanel(),
    });
  };

  const loadMilitary = async (): Promise<void> => {
    await loadMilitaryFlow({
      intelligenceCache: options.getIntelligenceCache(),
      map: options.getMap(),
      ciiPanel: (getPanel('cii') as CIIPanel | undefined) ?? null,
      insightsPanel: (getPanel('insights') as InsightsPanel | undefined) ?? null,
      statusPanel: options.getStatusPanel(),
      signalModal: options.getSignalModal(),
      renderCriticalBanner: options.renderCriticalBanner,
      posturePanel: (getPanel('strategic-posture') as StrategicPosturePanel | undefined) ?? null,
    });
  };

  const loadFredData = async (): Promise<void> => {
    await loadFredDataFlow({
      economicPanel: (getPanel('economic') as EconomicPanel | undefined) ?? null,
      statusPanel: options.getStatusPanel(),
    });
  };

  const loadOilAnalytics = async (): Promise<void> => {
    await loadOilAnalyticsFlow({
      economicPanel: (getPanel('economic') as EconomicPanel | undefined) ?? null,
      statusPanel: options.getStatusPanel(),
    });
  };

  const loadGovernmentSpending = async (): Promise<void> => {
    await loadGovernmentSpendingFlow({
      economicPanel: (getPanel('economic') as EconomicPanel | undefined) ?? null,
      statusPanel: options.getStatusPanel(),
    });
  };

  const loadFirmsData = async (): Promise<void> => {
    await loadFirmsDataFlow({
      map: options.getMap(),
      satelliteFiresPanel: (getPanel('satellite-fires') as SatelliteFiresPanel | undefined) ?? null,
      statusPanel: options.getStatusPanel(),
    });
  };

  const resetIntelligenceCache = (): void => {
    options.setIntelligenceCache({});
  };

  const loadAllData = async (
    inFlight: Set<string>,
    onTechReadiness: () => Promise<void> | void
  ): Promise<void> => {
    await loadAllDataFlow({
      mapLayers: options.getMapLayers(),
      inFlight,
      actions: {
        loadNews,
        loadMarkets,
        loadPredictions,
        loadPizzInt,
        loadFredData,
        loadOilAnalytics,
        loadGovernmentSpending,
        loadIntelligenceSignals,
        loadFirmsData,
        loadNatural,
        loadWeatherAlerts,
        loadAisSignals,
        loadCableActivity,
        loadFlightDelays,
        loadTechEvents,
        loadTechReadiness: onTechReadiness,
      },
      onTaskError: (name, error) => {
        console.error(`[App] ${name} load failed:`, error);
      },
      onSearchIndexUpdate: () => {
        updateSearchIndexFlow({
          searchModal: options.getSearchModal(),
          allNews: options.getAllNews(),
          latestPredictions: options.getLatestPredictions(),
          latestMarkets: options.getLatestMarkets(),
        });
      },
    });
  };

  const loadDataForLayer = async (layer: keyof MapLayers, inFlight: Set<string>): Promise<void> => {
    await loadDataForLayerFlow({
      layer,
      inFlight,
      map: options.getMap(),
      actions: {
        loadNatural,
        loadFirmsData,
        loadWeatherAlerts,
        loadOutages,
        loadAisSignals,
        loadCableActivity,
        loadProtests,
        loadFlightDelays,
        loadMilitary,
        loadTechEvents,
        loadIntelligenceSignals,
      },
    });
  };

  const setupRefreshIntervals = (
    scheduler: RefreshScheduler,
    getMapLayers: () => MapLayers
  ): void => {
    registerDefaultRefreshPlan({
      scheduler,
      getMapLayers,
      loadNews,
      loadMarkets,
      loadPredictions,
      loadPizzInt,
      loadNatural,
      loadWeatherAlerts,
      loadFredData,
      loadOilAnalytics,
      loadGovernmentSpending,
      loadIntelligenceSignals,
      loadFirmsData,
      loadAisSignals,
      loadCableActivity,
      loadFlightDelays,
      resetIntelligenceCache,
    });
  };

  return {
    loadAllData,
    loadDataForLayer,
    setupRefreshIntervals,
    loadPizzInt,
    loadNews,
    loadMarkets,
    loadPredictions,
    loadNatural,
    loadTechEvents,
    loadWeatherAlerts,
    loadIntelligenceSignals,
    loadOutages,
    loadAisSignals,
    waitForAisData,
    loadCableActivity,
    loadProtests,
    loadFlightDelays,
    loadMilitary,
    loadFredData,
    loadOilAnalytics,
    loadGovernmentSpending,
    loadFirmsData,
    runCorrelationAnalysis,
    updateMonitorResults,
    resetIntelligenceCache,
  };
}
