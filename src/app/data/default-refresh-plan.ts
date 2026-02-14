import type { MapLayers } from '@/types';
import { REFRESH_INTERVALS, SITE_VARIANT } from '@/config';
import { RefreshScheduler } from '@/app/data/refresh-scheduler';

type AsyncTask = () => Promise<void>;

interface DefaultRefreshPlanOptions {
  scheduler: RefreshScheduler;
  getMapLayers: () => MapLayers;
  loadNews: AsyncTask;
  loadMarkets: AsyncTask;
  loadPredictions: AsyncTask;
  loadPizzInt: AsyncTask;
  loadNatural: AsyncTask;
  loadWeatherAlerts: AsyncTask;
  loadFredData: AsyncTask;
  loadOilAnalytics: AsyncTask;
  loadGovernmentSpending: AsyncTask;
  loadIntelligenceSignals: AsyncTask;
  loadFirmsData: AsyncTask;
  loadAisSignals: AsyncTask;
  loadCableActivity: AsyncTask;
  loadFlightDelays: AsyncTask;
  resetIntelligenceCache: () => void;
}

export function registerDefaultRefreshPlan(options: DefaultRefreshPlanOptions): void {
  const {
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
  } = options;

  // Always refresh news, markets, predictions, pizzint
  scheduler.schedule('news', loadNews, REFRESH_INTERVALS.feeds);
  scheduler.schedule('markets', loadMarkets, REFRESH_INTERVALS.markets);
  scheduler.schedule('predictions', loadPredictions, REFRESH_INTERVALS.predictions);
  scheduler.schedule('pizzint', loadPizzInt, 10 * 60 * 1000);

  // Only refresh layer data if layer is enabled
  scheduler.schedule('natural', loadNatural, 5 * 60 * 1000, () => getMapLayers().natural);
  scheduler.schedule('weather', loadWeatherAlerts, 10 * 60 * 1000, () => getMapLayers().weather);
  scheduler.schedule('fred', loadFredData, 30 * 60 * 1000);
  scheduler.schedule('oil', loadOilAnalytics, 30 * 60 * 1000);
  scheduler.schedule('spending', loadGovernmentSpending, 60 * 60 * 1000);

  // Refresh intelligence signals for CII (geopolitical variant only)
  // This handles outages, protests, military - updates map when layers enabled
  if (SITE_VARIANT === 'full') {
    scheduler.schedule('intelligence', async () => {
      resetIntelligenceCache();
      await loadIntelligenceSignals();
    }, 5 * 60 * 1000);
  }

  // Non-intelligence layer refreshes only
  // NOTE: outages, protests, military are refreshed by intelligence schedule above
  scheduler.schedule('firms', loadFirmsData, 30 * 60 * 1000);
  scheduler.schedule('ais', loadAisSignals, REFRESH_INTERVALS.ais, () => getMapLayers().ais);
  scheduler.schedule('cables', loadCableActivity, 30 * 60 * 1000, () => getMapLayers().cables);
  scheduler.schedule('flights', loadFlightDelays, 10 * 60 * 1000, () => getMapLayers().flights);
}
