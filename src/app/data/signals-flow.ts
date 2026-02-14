import type { PredictionPanel, SatelliteFiresPanel, StatusPanel, MapContainer } from '@/components';
import { fetchPredictions } from '@/services';
import { fetchAllFires, flattenFires, computeRegionStats } from '@/services/firms-satellite';
import { signalAggregator } from '@/services/signal-aggregator';
import { updateAndCheck } from '@/services/temporal-baseline';
import { dataFreshness } from '@/services/data-freshness';
import type { PredictionMarket } from '@/types';

interface LoadPredictionsFlowOptions {
  predictionPanel: PredictionPanel | null;
  statusPanel: StatusPanel | null;
  setLatestPredictions: (predictions: PredictionMarket[]) => void;
  runCorrelationAnalysis: () => Promise<void> | void;
}

interface LoadFirmsDataFlowOptions {
  map: MapContainer | null;
  satelliteFiresPanel: SatelliteFiresPanel | null;
  statusPanel: StatusPanel | null;
}

export async function loadPredictionsFlow(options: LoadPredictionsFlowOptions): Promise<void> {
  try {
    const predictions = await fetchPredictions();
    options.setLatestPredictions(predictions);
    options.predictionPanel?.renderPredictions(predictions);

    options.statusPanel?.updateFeed('Polymarket', { status: 'ok', itemCount: predictions.length });
    options.statusPanel?.updateApi('Polymarket', { status: 'ok' });
    dataFreshness.recordUpdate('polymarket', predictions.length);

    void options.runCorrelationAnalysis();
  } catch (error) {
    options.statusPanel?.updateFeed('Polymarket', { status: 'error', errorMessage: String(error) });
    options.statusPanel?.updateApi('Polymarket', { status: 'error' });
    dataFreshness.recordError('polymarket', String(error));
  }
}

export async function loadFirmsDataFlow(options: LoadFirmsDataFlowOptions): Promise<void> {
  try {
    const { regions, totalCount } = await fetchAllFires(1);
    if (totalCount > 0) {
      const flat = flattenFires(regions);
      const stats = computeRegionStats(regions);

      signalAggregator.ingestSatelliteFires(
        flat.map((fire) => ({
          lat: fire.lat,
          lon: fire.lon,
          brightness: fire.brightness,
          frp: fire.frp,
          region: fire.region,
          acq_date: fire.acq_date,
        }))
      );

      options.map?.setFires(flat);
      options.satelliteFiresPanel?.update(stats, totalCount);
      dataFreshness.recordUpdate('firms', totalCount);

      updateAndCheck([
        { type: 'satellite_fires', region: 'global', count: totalCount },
      ]).then((anomalies) => {
        if (anomalies.length > 0) {
          signalAggregator.ingestTemporalAnomalies(anomalies);
        }
      }).catch(() => {});
    }
    options.statusPanel?.updateApi('FIRMS', { status: 'ok' });
  } catch (error) {
    console.warn('[App] FIRMS load failed:', error);
    options.statusPanel?.updateApi('FIRMS', { status: 'error' });
    dataFreshness.recordError('firms', String(error));
  }
}
