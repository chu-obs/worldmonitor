import type { ClusteredEvent, MarketData, NewsItem, PredictionMarket } from '@/types';
import { clusterNewsHybrid } from '@/services/clustering';
import { analysisWorker } from '@/services';
import { ingestNewsForCII, isInLearningMode } from '@/services/country-instability';
import { dataFreshness } from '@/services/data-freshness';
import { detectGeoConvergence, geoConvergenceToSignal } from '@/services/geo-convergence';
import { addToSignalHistory } from '@/services';
import { mlWorker } from '@/services/ml-worker';
import type { SignalModal } from '@/components';

interface RunCorrelationAnalysisFlowOptions {
  allNews: NewsItem[];
  latestClusters: ClusteredEvent[];
  latestPredictions: PredictionMarket[];
  latestMarkets: MarketData[];
  seenGeoAlerts: Set<string>;
  signalModal: SignalModal | null;
  onClustersUpdated: (clusters: ClusteredEvent[]) => void;
  onCiiRefresh: () => void;
}

export async function runCorrelationAnalysisFlow(
  options: RunCorrelationAnalysisFlowOptions
): Promise<ClusteredEvent[]> {
  let clusters = options.latestClusters;

  // Ensure we have clusters (hybrid: semantic + Jaccard when ML available).
  if (clusters.length === 0 && options.allNews.length > 0) {
    clusters = mlWorker.isAvailable
      ? await clusterNewsHybrid(options.allNews)
      : await analysisWorker.clusterNews(options.allNews);
    options.onClustersUpdated(clusters);
  }

  // Ingest news clusters for CII.
  if (clusters.length > 0) {
    ingestNewsForCII(clusters);
    dataFreshness.recordUpdate('gdelt', clusters.length);
    options.onCiiRefresh();
  }

  // Run correlation analysis off main thread via Web Worker.
  const signals = await analysisWorker.analyzeCorrelations(
    clusters,
    options.latestPredictions,
    options.latestMarkets
  );

  // Detect geographic convergence (suppress during learning mode).
  let geoSignals: ReturnType<typeof geoConvergenceToSignal>[] = [];
  if (!isInLearningMode()) {
    const geoAlerts = detectGeoConvergence(options.seenGeoAlerts);
    geoSignals = geoAlerts.map(geoConvergenceToSignal);
  }

  const allSignals = [...signals, ...geoSignals];
  if (allSignals.length > 0) {
    addToSignalHistory(allSignals);
    options.signalModal?.show(allSignals);
  }

  return clusters;
}
