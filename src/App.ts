import type {
  ClusteredEvent,
  MapLayers,
  MarketData,
  Monitor,
  NewsItem,
  PanelConfig,
  PredictionMarket,
} from '@/types';
import { STORAGE_KEYS, SITE_VARIANT } from '@/config';
import {
  cleanOldSnapshots,
  disconnectAisStream,
  initAisStream,
  initDB,
  isAisConfigured,
  isOutagesConfigured,
} from '@/services';
import { mlWorker } from '@/services/ml-worker';
import type { TheaterPostureSummary } from '@/services/military-surge';
import { startLearning } from '@/services/country-instability';
import { dataFreshness } from '@/services/data-freshness';
import { isMobileDevice, loadFromStorage, saveToStorage } from '@/utils';
import type { ParsedMapUrlState } from '@/utils';
import type { IntelligenceCache } from '@/app/state/country-signals';
import { initializeBootstrapSettings } from '@/app/state/bootstrap-settings';
import { IDLE_ACTIVITY_EVENTS } from '@/app/layout/idle-detection';
import { renderLayoutRuntimeFlow } from '@/app/layout/runtime-layout';
import { renderCriticalBannerFlow } from '@/app/layout/critical-banner';
import { showToastMessage } from '@/app/layout/toast';
import { destroyAppResourcesFlow } from '@/app/lifecycle/destroy';
import {
  finalizePostLoadRuntimeFlow,
  setupHeaderPlaybackRuntimeFlow,
  setupInteractiveRuntimeFlow,
} from '@/app/lifecycle/runtime-startup';
import { initializeStartupPrerequisitesFlow } from '@/app/lifecycle/startup';
import { restoreSnapshotFlow } from '@/app/data/playback-flow';
import { RefreshScheduler } from '@/app/data/refresh-scheduler';
import {
  createRuntimeLoaderCoordinator,
  type RuntimeLoaderCoordinator,
} from '@/app/data/runtime-loader-coordinator';
import { handleRelatedAssetClickFlow } from '@/app/panels/related-assets';
import { openCountryStoryFlow } from '@/app/panels/story-flow';
import { CountryIntelModal } from '@/components/CountryIntelModal';
import {
  CIIPanel,
  MapContainer,
  MobileWarningModal,
  NewsPanel,
  Panel,
  PizzIntIndicator,
  PredictionPanel,
  SearchModal,
  SignalModal,
  StatusPanel,
  StrategicPosturePanel,
  TechReadinessPanel,
} from '@/components';

export class App {
  private container: HTMLElement;
  private readonly PANEL_ORDER_KEY = 'panel-order';
  private map: MapContainer | null = null;
  private panels: Record<string, Panel> = {};
  private newsPanels: Record<string, NewsPanel> = {};
  private allNews: NewsItem[] = [];
  private monitors: Monitor[];
  private panelSettings: Record<string, PanelConfig>;
  private mapLayers: MapLayers;
  private signalModal: SignalModal | null = null;
  private statusPanel: StatusPanel | null = null;
  private searchModal: SearchModal | null = null;
  private pizzintIndicator: PizzIntIndicator | null = null;
  private latestPredictions: PredictionMarket[] = [];
  private latestMarkets: MarketData[] = [];
  private latestClusters: ClusteredEvent[] = [];
  private isPlaybackMode = false;
  private initialUrlState: ParsedMapUrlState | null = null;
  private inFlight: Set<string> = new Set();
  private refreshScheduler: RefreshScheduler;
  private isMobile: boolean;
  private seenGeoAlerts: Set<string> = new Set();
  private timeIntervalId: ReturnType<typeof setInterval> | null = null;
  private snapshotIntervalId: ReturnType<typeof setInterval> | null = null;
  private isDestroyed = false;
  private boundKeydownHandler: ((e: KeyboardEvent) => void) | null = null;
  private boundFullscreenHandler: (() => void) | null = null;
  private boundResizeHandler: (() => void) | null = null;
  private boundVisibilityHandler: (() => void) | null = null;
  private idleTimeoutId: ReturnType<typeof setTimeout> | null = null;
  private boundIdleResetHandler: (() => void) | null = null;
  private isIdle = false;
  private readonly IDLE_PAUSE_MS = 2 * 60 * 1000; // 2 minutes - pause animations when idle
  private disabledSources: Set<string> = new Set();
  private intelligenceCache: IntelligenceCache = {};
  private mapFlashCache: Map<string, number> = new Map();
  private readonly MAP_FLASH_COOLDOWN_MS = 10 * 60 * 1000;
  private initialLoadComplete = false;
  private criticalBannerEl: HTMLElement | null = null;
  private countryIntelModal: CountryIntelModal | null = null;
  private runtimeLoaders: RuntimeLoaderCoordinator;
  private readonly openCountryStory = (code: string, name: string): void => {
    const posturePanel = this.panels['strategic-posture'] as StrategicPosturePanel | undefined;
    const postures = posturePanel?.getPostures() || [];
    openCountryStoryFlow({
      code,
      name,
      intelligenceCache: this.intelligenceCache,
      latestClusters: this.latestClusters,
      latestPredictions: this.latestPredictions,
      postures,
      onNotReady: () => {
        showToastMessage('Data still loading — try again in a moment');
      },
    });
  };
  private readonly renderCriticalBanner = (postures: TheaterPostureSummary[]): void => {
    renderCriticalBannerFlow({
      postures,
      currentBannerEl: this.criticalBannerEl,
      setBannerEl: (element) => {
        this.criticalBannerEl = element;
      },
      onCenterMap: (lat, lon, zoom) => {
        this.map?.setCenter(lat, lon, zoom);
      },
    });
  };

  constructor(containerId: string) {
    const el = document.getElementById(containerId);
    if (!el) throw new Error(`Container ${containerId} not found`);
    this.container = el;

    this.refreshScheduler = new RefreshScheduler({
      inFlight: this.inFlight,
      isDestroyed: () => this.isDestroyed,
      onError: (name, error) => {
        console.error(`[App] Refresh ${name} failed:`, error);
      },
    });

    this.isMobile = isMobileDevice();
    this.monitors = loadFromStorage<Monitor[]>(STORAGE_KEYS.monitors, []);
    const bootstrapState = initializeBootstrapSettings({
      isMobile: this.isMobile,
      panelOrderKey: this.PANEL_ORDER_KEY,
      siteVariant: SITE_VARIANT,
      urlSearch: window.location.search,
    });
    this.mapLayers = bootstrapState.mapLayers;
    this.panelSettings = bootstrapState.panelSettings;
    this.initialUrlState = bootstrapState.initialUrlState;
    this.disabledSources = bootstrapState.disabledSources;

    this.runtimeLoaders = createRuntimeLoaderCoordinator({
      siteVariant: SITE_VARIANT,
      mapFlashCooldownMs: this.MAP_FLASH_COOLDOWN_MS,
      getMap: () => this.map,
      getPanels: () => this.panels,
      getNewsPanels: () => this.newsPanels,
      getStatusPanel: () => this.statusPanel,
      getSignalModal: () => this.signalModal,
      getSearchModal: () => this.searchModal,
      getPizzintIndicator: () => this.pizzintIndicator,
      getMapLayers: () => this.mapLayers,
      getDisabledSources: () => this.disabledSources,
      getAllNews: () => this.allNews,
      setAllNews: (news) => {
        this.allNews = news;
      },
      getInitialLoadComplete: () => this.initialLoadComplete,
      setInitialLoadComplete: (isComplete) => {
        this.initialLoadComplete = isComplete;
      },
      getMapFlashCache: () => this.mapFlashCache,
      getLatestPredictions: () => this.latestPredictions,
      setLatestPredictions: (predictions) => {
        this.latestPredictions = predictions;
      },
      getLatestMarkets: () => this.latestMarkets,
      setLatestMarkets: (markets) => {
        this.latestMarkets = markets;
      },
      getLatestClusters: () => this.latestClusters,
      setLatestClusters: (clusters) => {
        this.latestClusters = clusters;
      },
      getSeenGeoAlerts: () => this.seenGeoAlerts,
      getIntelligenceCache: () => this.intelligenceCache,
      setIntelligenceCache: (cache) => {
        this.intelligenceCache = cache;
      },
      renderCriticalBanner: (postures) => {
        this.renderCriticalBanner(postures);
      },
    });
  }

  public async init(): Promise<void> {
    await initializeStartupPrerequisitesFlow({
      mapLayers: this.mapLayers,
      initDatabase: () => initDB(),
      initMlWorker: () => mlWorker.init(),
      isAisConfigured: () => isAisConfigured(),
      initAisStream: () => {
        initAisStream();
      },
    });

    const layout = renderLayoutRuntimeFlow({
      container: this.container,
      siteVariant: SITE_VARIANT,
      appVersion: __APP_VERSION__,
      panelOrderKey: this.PANEL_ORDER_KEY,
      isMobile: this.isMobile,
      mapLayers: this.mapLayers,
      panelSettings: this.panelSettings,
      initialUrlState: this.initialUrlState,
      panels: this.panels,
      newsPanels: this.newsPanels,
      monitors: this.monitors,
      onMonitorsChanged: (monitors) => {
        this.monitors = monitors;
        saveToStorage(STORAGE_KEYS.monitors, monitors);
        this.runtimeLoaders.updateMonitorResults();
      },
      attachRelatedAssetHandlers: (panel, map) => {
        panel.setRelatedAssetHandlers({
          onRelatedAssetClick: (asset) => {
            handleRelatedAssetClickFlow(asset, {
              map,
              mapLayers: this.mapLayers,
            });
          },
          onRelatedAssetsFocus: (assets) => map.highlightAssets(assets),
          onRelatedAssetsClear: () => map.highlightAssets(null),
        });
      },
      onShareStory: (countryCode, countryName) => {
        this.openCountryStory(countryCode, countryName);
      },
      onLayersResolved: (layers) => {
        this.mapLayers = layers;
        saveToStorage(STORAGE_KEYS.mapLayers, this.mapLayers);
      },
    });
    this.map = layout.map;
    this.timeIntervalId = layout.timeIntervalId;
    const headerRuntime = setupHeaderPlaybackRuntimeFlow({
      container: this.container,
      siteVariant: SITE_VARIANT,
      shouldShowMobileWarning: () => MobileWarningModal.shouldShow(),
      showMobileWarning: () => {
        const modal = new MobileWarningModal();
        modal.show();
      },
      isCountryIntelVisible: () => this.countryIntelModal?.isVisible() === true,
      onCenterMap: (lat, lon, zoom) => {
        this.map?.setCenter(lat, lon, zoom);
      },
      onPlaybackSnapshot: (snapshot) => {
        restoreSnapshotFlow({
          snapshot,
          newsPanels: this.newsPanels,
          setLatestClusters: (clusters) => {
            this.latestClusters = clusters;
          },
          setLatestPredictions: (predictions) => {
            this.latestPredictions = predictions;
          },
          renderPredictions: (predictions) => {
            (this.panels['polymarket'] as PredictionPanel).renderPredictions(predictions);
          },
          setHotspotLevels: (levels) => {
            this.map?.setHotspotLevels(levels);
          },
        });
      },
      onPlaybackLive: () => {
        void this.runtimeLoaders.loadAllData(
          this.inFlight,
          () => (this.panels['tech-readiness'] as TechReadinessPanel)?.refresh()
        );
      },
      setPlaybackMode: (isPlaybackMode) => {
        this.isPlaybackMode = isPlaybackMode;
      },
      getSnapshotData: () => ({
        news: this.latestClusters.length > 0 ? this.latestClusters : this.allNews,
        markets: this.latestMarkets,
        predictions: this.latestPredictions,
        timestamp: Date.now(),
      }),
    });
    this.signalModal = headerRuntime.signalModal;
    this.statusPanel = headerRuntime.statusPanel;
    this.pizzintIndicator = headerRuntime.pizzintIndicator;

    const interactiveRuntime = setupInteractiveRuntimeFlow({
      container: this.container,
      siteVariant: SITE_VARIANT,
      map: this.map,
      mapLayers: this.mapLayers,
      setFreshnessEnabled: (sourceId, enabled) => {
        dataFreshness.setEnabled(sourceId, enabled);
      },
      isAisConfigured: () => isAisConfigured(),
      isOutagesConfigured: () => isOutagesConfigured(),
      getAllNews: () => this.allNews,
      getLatestPredictions: () => this.latestPredictions,
      getLatestMarkets: () => this.latestMarkets,
      getDisabledSources: () => this.disabledSources,
      setDisabledSources: (nextDisabledSources) => {
        this.disabledSources = nextDisabledSources;
      },
      onPersistMapLayers: () => {
        saveToStorage(STORAGE_KEYS.mapLayers, this.mapLayers);
      },
      onEnableAis: () => {
        initAisStream();
      },
      onDisableAis: () => {
        disconnectAisStream();
      },
      onWaitForAisData: () => {
        this.runtimeLoaders.waitForAisData();
      },
      onLoadDataForLayer: (layer) => {
        void this.runtimeLoaders.loadDataForLayer(layer, this.inFlight);
      },
      onShareStory: (code, name) => this.openCountryStory(code, name),
      getIntelligenceCache: () => this.intelligenceCache,
      onVisibilityHidden: () => {
        mlWorker.unloadOptionalModels();
      },
      onFocalPointsReady: () => {
        (this.panels['cii'] as CIIPanel)?.refresh(true);
      },
      idleState: {
        idlePauseMs: this.IDLE_PAUSE_MS,
        getIsIdle: () => this.isIdle,
        setIsIdle: (isIdle) => {
          this.isIdle = isIdle;
        },
        getIdleTimeoutId: () => this.idleTimeoutId,
        setIdleTimeoutId: (timeoutId) => {
          this.idleTimeoutId = timeoutId;
        },
        setBoundIdleResetHandler: (handler) => {
          this.boundIdleResetHandler = handler;
        },
      },
      regionSelect: document.getElementById('regionSelect') as HTMLSelectElement | null,
      replaceUrl: (url) => {
        history.replaceState(null, '', url);
      },
    });
    this.searchModal = interactiveRuntime.searchModal;
    this.boundKeydownHandler = interactiveRuntime.keydownHandler;
    this.countryIntelModal = interactiveRuntime.countryIntelModal;
    this.boundResizeHandler = interactiveRuntime.resizeHandler;
    this.boundFullscreenHandler = interactiveRuntime.fullscreenHandler;
    this.boundVisibilityHandler = interactiveRuntime.visibilityHandler;
    await this.runtimeLoaders.loadAllData(
      this.inFlight,
      () => (this.panels['tech-readiness'] as TechReadinessPanel)?.refresh()
    );

    finalizePostLoadRuntimeFlow({
      startLearning: () => {
        startLearning();
      },
      isAisConfigured: () => isAisConfigured(),
      isOutagesConfigured: () => isOutagesConfigured(),
      hideLayerToggle: (layer) => {
        this.map?.hideLayerToggle(layer);
      },
      setupRefreshIntervals: () => {
        this.runtimeLoaders.setupRefreshIntervals(
          this.refreshScheduler,
          () => this.mapLayers
        );
      },
      cleanOldSnapshots: () => {
        cleanOldSnapshots();
      },
      isPlaybackMode: () => this.isPlaybackMode,
      isDestroyed: () => this.isDestroyed,
      getLatestMarkets: () => this.latestMarkets,
      getLatestClusters: () => this.latestClusters,
      getLatestPredictions: () => this.latestPredictions,
      getHotspotLevels: () => this.map?.getHotspotLevels() ?? {},
      setSnapshotIntervalId: (intervalId) => {
        this.snapshotIntervalId = intervalId;
      },
      hasSufficientData: () => dataFreshness.hasSufficientData(),
      hasAnyCluster: () => this.latestClusters.length > 0,
      openCountryStory: (countryCode, countryName) => this.openCountryStory(countryCode, countryName),
      replaceUrl: (path) => history.replaceState(null, '', path),
    });
  }

  /**
   * Clean up resources (for HMR/testing)
   */
  public destroy(): void {
    this.isDestroyed = true;
    const cleaned = destroyAppResourcesFlow({
      timeIntervalId: this.timeIntervalId,
      snapshotIntervalId: this.snapshotIntervalId,
      idleTimeoutId: this.idleTimeoutId,
      boundKeydownHandler: this.boundKeydownHandler,
      boundFullscreenHandler: this.boundFullscreenHandler,
      boundResizeHandler: this.boundResizeHandler,
      boundVisibilityHandler: this.boundVisibilityHandler,
      boundIdleResetHandler: this.boundIdleResetHandler,
      idleActivityEvents: IDLE_ACTIVITY_EVENTS,
      map: this.map,
      cancelRefreshes: () => {
        this.refreshScheduler.cancelAll();
      },
      disconnectAis: () => {
        disconnectAisStream();
      },
    });
    this.timeIntervalId = cleaned.timeIntervalId;
    this.snapshotIntervalId = cleaned.snapshotIntervalId;
    this.idleTimeoutId = cleaned.idleTimeoutId;
    this.boundKeydownHandler = cleaned.boundKeydownHandler;
    this.boundFullscreenHandler = cleaned.boundFullscreenHandler;
    this.boundResizeHandler = cleaned.boundResizeHandler;
    this.boundVisibilityHandler = cleaned.boundVisibilityHandler;
    this.boundIdleResetHandler = cleaned.boundIdleResetHandler;
  }

}
