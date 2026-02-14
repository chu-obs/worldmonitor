import type { ClusteredEvent, NewsItem } from '@/types';
import { analysisWorker } from '@/services';
import { mlWorker } from '@/services/ml-worker';
import { clusterNewsHybrid } from '@/services/clustering';
import { signalAggregator } from '@/services/signal-aggregator';
import { updateAndCheck } from '@/services/temporal-baseline';

interface FinalizeNewsLoadStateFlowOptions {
  collectedNews: NewsItem[];
  setAllNews: (news: NewsItem[]) => void;
  setInitialLoadComplete: (isComplete: boolean) => void;
  updateHotspotActivity: (news: NewsItem[]) => void;
  updateMonitorResults: () => void;
}

interface ClusterNewsResultsFlowOptions {
  allNews: NewsItem[];
  setLatestClusters: (clusters: ClusteredEvent[]) => void;
  updateInsights: (clusters: ClusteredEvent[]) => void;
  setNewsLocations: (locations: Array<{ lat: number; lon: number; title: string; threatLevel: string }>) => void;
}

export function finalizeNewsLoadStateFlow(options: FinalizeNewsLoadStateFlowOptions): void {
  options.setAllNews(options.collectedNews);
  options.setInitialLoadComplete(true);

  updateAndCheck([
    { type: 'news', region: 'global', count: options.collectedNews.length },
  ])
    .then(anomalies => {
      if (anomalies.length > 0) {
        signalAggregator.ingestTemporalAnomalies(anomalies);
      }
    })
    .catch(() => {});

  options.updateHotspotActivity(options.collectedNews);
  options.updateMonitorResults();
}

export async function clusterNewsResultsFlow(options: ClusterNewsResultsFlowOptions): Promise<void> {
  try {
    const clusters = mlWorker.isAvailable
      ? await clusterNewsHybrid(options.allNews)
      : await analysisWorker.clusterNews(options.allNews);

    options.setLatestClusters(clusters);

    if (mlWorker.isAvailable && clusters.length > 0) {
      options.updateInsights(clusters);
    }

    const geoLocated = clusters
      .filter((cluster): cluster is typeof cluster & { lat: number; lon: number } => (
        cluster.lat != null && cluster.lon != null
      ))
      .map(cluster => ({
        lat: cluster.lat,
        lon: cluster.lon,
        title: cluster.primaryTitle,
        threatLevel: cluster.threat?.level ?? 'info',
      }));
    if (geoLocated.length > 0) {
      options.setNewsLocations(geoLocated);
    }
  } catch (error) {
    console.error('[App] Clustering failed, clusters unchanged:', error);
  }
}
