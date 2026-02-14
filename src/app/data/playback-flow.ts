import { PlaybackControl } from '@/components';
import { saveSnapshot } from '@/services';
import type { DashboardSnapshot } from '@/services/storage';
import type { ClusteredEvent, MarketData, PredictionMarket } from '@/types';

interface SetupPlaybackControlFlowOptions {
  container: HTMLElement;
  onPlaybackSnapshot: (snapshot: DashboardSnapshot) => void;
  onPlaybackLive: () => void;
  setPlaybackMode: (isPlaybackMode: boolean) => void;
}

export function setupPlaybackControlFlow(options: SetupPlaybackControlFlowOptions): PlaybackControl {
  const playbackControl = new PlaybackControl();
  playbackControl.onSnapshot((snapshot) => {
    if (snapshot) {
      options.setPlaybackMode(true);
      options.onPlaybackSnapshot(snapshot);
    } else {
      options.setPlaybackMode(false);
      options.onPlaybackLive();
    }
  });

  const headerRight = options.container.querySelector('.header-right');
  if (headerRight) {
    headerRight.insertBefore(playbackControl.getElement(), headerRight.firstChild);
  }

  return playbackControl;
}

interface SetupSnapshotSavingFlowOptions {
  isPlaybackMode: () => boolean;
  isDestroyed: () => boolean;
  latestMarkets: () => MarketData[];
  latestClusters: () => ClusteredEvent[];
  latestPredictions: () => PredictionMarket[];
  getHotspotLevels: () => Record<string, string>;
}

export function setupSnapshotSavingFlow(
  options: SetupSnapshotSavingFlowOptions
): ReturnType<typeof setInterval> {
  const saveCurrentSnapshot = async () => {
    if (options.isPlaybackMode() || options.isDestroyed()) return;

    const marketPrices: Record<string, number> = {};
    for (const market of options.latestMarkets()) {
      if (market.price !== null) marketPrices[market.symbol] = market.price;
    }

    await saveSnapshot({
      timestamp: Date.now(),
      events: options.latestClusters(),
      marketPrices,
      predictions: options.latestPredictions().map((prediction) => ({
        title: prediction.title,
        yesPrice: prediction.yesPrice,
      })),
      hotspotLevels: options.getHotspotLevels(),
    });
  };

  void saveCurrentSnapshot();
  return setInterval(() => {
    void saveCurrentSnapshot();
  }, 15 * 60 * 1000);
}

interface NewsPanelLoadingLike {
  showLoading: () => void;
}

interface RestoreSnapshotFlowOptions {
  snapshot: DashboardSnapshot;
  newsPanels: Record<string, NewsPanelLoadingLike>;
  setLatestClusters: (clusters: ClusteredEvent[]) => void;
  setLatestPredictions: (predictions: PredictionMarket[]) => void;
  renderPredictions: (predictions: PredictionMarket[]) => void;
  setHotspotLevels: (levels: Record<string, string>) => void;
}

export function restoreSnapshotFlow(options: RestoreSnapshotFlowOptions): void {
  for (const panel of Object.values(options.newsPanels)) {
    panel.showLoading();
  }

  const events = options.snapshot.events as ClusteredEvent[];
  options.setLatestClusters(events);

  const predictions: PredictionMarket[] = options.snapshot.predictions.map((prediction, index) => ({
    id: `snap-${index}`,
    title: prediction.title,
    yesPrice: prediction.yesPrice,
    noPrice: 1 - prediction.yesPrice,
    volume24h: 0,
    liquidity: 0,
  }));

  options.setLatestPredictions(predictions);
  options.renderPredictions(predictions);
  options.setHotspotLevels(options.snapshot.hotspotLevels);
}
