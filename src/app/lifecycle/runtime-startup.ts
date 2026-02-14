import type { ClusteredEvent, MapLayers, MarketData, NewsItem, PredictionMarket } from '@/types';
import { CountryIntelModal } from '@/components/CountryIntelModal';
import type { IntelligenceCache } from '@/app/state/country-signals';
import type { DataSourceId } from '@/services/data-freshness';
import type {
  MapContainer,
  PizzIntIndicator,
  SearchModal,
  SignalModal,
  StatusPanel,
} from '@/components';
import type { DashboardSnapshot } from '@/services/storage';
import { handleStoryDeepLink } from '@/app/state/story-deeplink';
import { finalizeInitializationFlow, setupSignalModalFlow } from '@/app/lifecycle/startup';
import { setupPlaybackControlFlow, setupSnapshotSavingFlow } from '@/app/data/playback-flow';
import {
  setupExportPanelFlow,
  setupPizzIntIndicatorFlow,
  setupStatusPanelFlow,
} from '@/app/layout/header-widgets';
import { setupSearchModalFlow, updateSearchIndexFlow } from '@/app/panels/search-flow';
import { setupMapLayerHandlersFlow } from '@/app/state/layer-change';
import { syncAllLayerFreshness, syncSingleLayerFreshness } from '@/app/state/layer-freshness';
import { setupCountryIntelFlow } from '@/app/panels/country-intel-flow';
import { setupCoreEventHandlersFlow } from '@/app/layout/event-setup';
import { setupUrlStateSyncFlow } from '@/app/state/url-controls';

interface SetupHeaderPlaybackRuntimeFlowOptions {
  container: HTMLElement;
  siteVariant: string;
  shouldShowMobileWarning: () => boolean;
  showMobileWarning: () => void;
  isCountryIntelVisible: () => boolean;
  onCenterMap: (lat: number, lon: number, zoom: number) => void;
  onPlaybackSnapshot: (snapshot: DashboardSnapshot) => void;
  onPlaybackLive: () => void;
  setPlaybackMode: (isPlaybackMode: boolean) => void;
  getSnapshotData: () => {
    news: NewsItem[] | ClusteredEvent[];
    markets: MarketData[];
    predictions: PredictionMarket[];
    timestamp: number;
  };
}

interface SetupHeaderPlaybackRuntimeFlowResult {
  signalModal: SignalModal;
  statusPanel: StatusPanel;
  pizzintIndicator: PizzIntIndicator | null;
}

interface SetupInteractiveRuntimeFlowOptions {
  container: HTMLElement;
  siteVariant: string;
  map: MapContainer | null;
  mapLayers: MapLayers;
  setFreshnessEnabled: (sourceId: DataSourceId, enabled: boolean) => void;
  isAisConfigured: () => boolean;
  isOutagesConfigured: () => boolean | null;
  getAllNews: () => NewsItem[];
  getLatestPredictions: () => PredictionMarket[];
  getLatestMarkets: () => MarketData[];
  getDisabledSources: () => Set<string>;
  setDisabledSources: (nextDisabledSources: Set<string>) => void;
  onPersistMapLayers: () => void;
  onEnableAis: () => void;
  onDisableAis: () => void;
  onWaitForAisData: () => void;
  onLoadDataForLayer: (layer: keyof MapLayers) => void;
  onShareStory: (code: string, name: string) => void;
  getIntelligenceCache: () => IntelligenceCache;
  onVisibilityHidden: () => void;
  onFocalPointsReady: () => void;
  idleState: Parameters<typeof setupCoreEventHandlersFlow>[0]['idleState'];
  regionSelect: HTMLSelectElement | null;
  replaceUrl: (url: string) => void;
}

interface SetupInteractiveRuntimeFlowResult {
  searchModal: SearchModal;
  keydownHandler: (e: KeyboardEvent) => void;
  countryIntelModal: CountryIntelModal | null;
  resizeHandler: () => void;
  fullscreenHandler: () => void;
  visibilityHandler: () => void;
}

interface FinalizePostLoadRuntimeFlowOptions {
  startLearning: () => void;
  isAisConfigured: () => boolean;
  isOutagesConfigured: () => boolean | null;
  hideLayerToggle: (layer: 'ais' | 'outages') => void;
  setupRefreshIntervals: () => void;
  cleanOldSnapshots: () => void;
  isPlaybackMode: () => boolean;
  isDestroyed: () => boolean;
  getLatestMarkets: () => MarketData[];
  getLatestClusters: () => ClusteredEvent[];
  getLatestPredictions: () => PredictionMarket[];
  getHotspotLevels: () => Record<string, string>;
  setSnapshotIntervalId: (intervalId: ReturnType<typeof setInterval>) => void;
  hasSufficientData: () => boolean;
  hasAnyCluster: () => boolean;
  openCountryStory: (countryCode: string, countryName: string) => void;
  replaceUrl: (path: string) => void;
}

export function setupHeaderPlaybackRuntimeFlow(
  options: SetupHeaderPlaybackRuntimeFlowOptions
): SetupHeaderPlaybackRuntimeFlowResult {
  let signalModal: SignalModal | null = null;
  setupSignalModalFlow({
    onCenterMap: options.onCenterMap,
    isCountryIntelVisible: options.isCountryIntelVisible,
    setSignalModal: (modal) => {
      signalModal = modal;
    },
  });

  if (options.shouldShowMobileWarning()) {
    options.showMobileWarning();
  }

  setupPlaybackControlFlow({
    container: options.container,
    onPlaybackSnapshot: options.onPlaybackSnapshot,
    onPlaybackLive: options.onPlaybackLive,
    setPlaybackMode: options.setPlaybackMode,
  });

  const statusPanel = setupStatusPanelFlow(options.container);
  const pizzintIndicator = options.siteVariant === 'tech'
    ? null
    : setupPizzIntIndicatorFlow(options.container);

  setupExportPanelFlow({
    container: options.container,
    getSnapshotData: options.getSnapshotData,
  });

  if (!signalModal) {
    throw new Error('Signal modal initialization failed');
  }

  return {
    signalModal,
    statusPanel,
    pizzintIndicator,
  };
}

export function setupInteractiveRuntimeFlow(
  options: SetupInteractiveRuntimeFlowOptions
): SetupInteractiveRuntimeFlowResult {
  const searchState = setupSearchModalFlow({
    container: options.container,
    siteVariant: options.siteVariant,
    getMap: () => options.map,
    getMapLayers: () => options.mapLayers,
    getAllNews: options.getAllNews,
    getLatestPredictions: options.getLatestPredictions,
    getLatestMarkets: options.getLatestMarkets,
  });

  setupMapLayerHandlersFlow({
    map: options.map,
    mapLayers: options.mapLayers,
    onPersistMapLayers: options.onPersistMapLayers,
    onSyncFreshness: (layer, enabled) => {
      syncSingleLayerFreshness(layer, enabled, {
        setEnabled: options.setFreshnessEnabled,
      });
    },
    onEnableAis: options.onEnableAis,
    onDisableAis: options.onDisableAis,
    onWaitForAisData: options.onWaitForAisData,
    onLoadDataForLayer: options.onLoadDataForLayer,
  });

  let countryIntelModal: CountryIntelModal | null = null;
  if (options.map) {
    countryIntelModal = new CountryIntelModal();
    setupCountryIntelFlow({
      map: options.map,
      modal: countryIntelModal,
      onShareStory: options.onShareStory,
      getIntelligenceCache: options.getIntelligenceCache,
      getAllNews: options.getAllNews,
    });
  }

  const handlers = setupCoreEventHandlersFlow({
    map: options.map,
    updateSearchIndex: () => {
      updateSearchIndexFlow({
        searchModal: searchState.searchModal,
        allNews: options.getAllNews(),
        latestPredictions: options.getLatestPredictions(),
        latestMarkets: options.getLatestMarkets(),
      });
    },
    openSearchModal: () => {
      searchState.searchModal.open();
    },
    setupSourcesModal: () => {
      import('@/app/layout/sources-modal').then(({ setupSourcesModalFlow }) => {
        setupSourcesModalFlow({
          getDisabledSources: options.getDisabledSources,
          setDisabledSources: options.setDisabledSources,
        });
      }).catch((error) => {
        console.error('[RuntimeStartup] Failed to load sources modal:', error);
      });
    },
    idleState: options.idleState,
    onFocalPointsReady: options.onFocalPointsReady,
    onVisibilityHidden: options.onVisibilityHidden,
  });

  setupUrlStateSyncFlow({
    map: options.map,
    regionSelect: options.regionSelect,
    replaceUrl: options.replaceUrl,
  });

  syncAllLayerFreshness(options.mapLayers, {
    setEnabled: options.setFreshnessEnabled,
  });
  if (!options.isAisConfigured()) {
    options.setFreshnessEnabled('ais', false);
  }
  if (options.isOutagesConfigured() === false) {
    options.setFreshnessEnabled('outages', false);
  }

  return {
    searchModal: searchState.searchModal,
    keydownHandler: searchState.keydownHandler,
    countryIntelModal,
    resizeHandler: handlers.resizeHandler,
    fullscreenHandler: handlers.fullscreenHandler,
    visibilityHandler: handlers.visibilityHandler,
  };
}

export function finalizePostLoadRuntimeFlow(options: FinalizePostLoadRuntimeFlowOptions): void {
  finalizeInitializationFlow({
    startLearning: options.startLearning,
    isAisConfigured: options.isAisConfigured,
    isOutagesConfigured: options.isOutagesConfigured,
    hideLayerToggle: options.hideLayerToggle,
    setupRefreshIntervals: options.setupRefreshIntervals,
    setupSnapshotSaving: () => {
      const intervalId = setupSnapshotSavingFlow({
        isPlaybackMode: options.isPlaybackMode,
        isDestroyed: options.isDestroyed,
        latestMarkets: options.getLatestMarkets,
        latestClusters: options.getLatestClusters,
        latestPredictions: options.getLatestPredictions,
        getHotspotLevels: options.getHotspotLevels,
      });
      if (intervalId) {
        options.setSnapshotIntervalId(intervalId);
      }
    },
    cleanOldSnapshots: options.cleanOldSnapshots,
    handleDeepLinks: () => {
      handleStoryDeepLink({
        hasSufficientData: options.hasSufficientData,
        hasAnyCluster: options.hasAnyCluster,
        openCountryStory: options.openCountryStory,
        replaceUrl: options.replaceUrl,
      });
    },
  });
}
