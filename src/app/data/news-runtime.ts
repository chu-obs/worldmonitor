import { FEEDS, INTEL_SOURCES, SITE_VARIANT } from '@/config';
import type { ClusteredEvent, NewsItem } from '@/types';
import type { MapContainer, NewsPanel, StatusPanel } from '@/components';
import { flashMapForNewsFlow } from '@/app/state/map-flash';
import {
  collectCategoryNews,
  getConfiguredNewsCategories,
  loadIntelNewsFlow,
  loadNewsCategoryFlow,
} from '@/app/data/news-flow';
import { clusterNewsResultsFlow, finalizeNewsLoadStateFlow } from '@/app/data/news-post-load';

interface LoadNewsRuntimeFlowOptions {
  map: MapContainer | null;
  newsPanels: Record<string, NewsPanel>;
  statusPanel: StatusPanel | null;
  disabledSources: Set<string>;
  initialLoadComplete: boolean;
  mapFlashCache: Map<string, number>;
  mapFlashCooldownMs: number;
  updateMonitorResults: () => void;
  setAllNews: (news: NewsItem[]) => void;
  setInitialLoadComplete: (isComplete: boolean) => void;
  setLatestClusters: (clusters: ClusteredEvent[]) => void;
  updateInsights: (clusters: ClusteredEvent[]) => void;
  setNewsLocations: (locations: Array<{ lat: number; lon: number; title: string; threatLevel: string }>) => void;
}

export async function loadNewsRuntimeFlow(options: LoadNewsRuntimeFlowOptions): Promise<void> {
  const flashMapForNews = (items: NewsItem[]): void => {
    flashMapForNewsFlow({
      map: options.map,
      items,
      initialLoadComplete: options.initialLoadComplete,
      mapFlashCache: options.mapFlashCache,
      cooldownMs: options.mapFlashCooldownMs,
    });
  };

  const categories = getConfiguredNewsCategories(FEEDS);
  const collectedNews = await collectCategoryNews({
    categories,
    loadCategory: (category) => loadNewsCategoryFlow({
      category: category.key,
      feeds: category.feeds,
      panel: options.newsPanels[category.key],
      disabledSources: options.disabledSources,
      flashMapForNews,
      setFeedStatus: (feedName, payload) => {
        options.statusPanel?.updateFeed(feedName, payload);
      },
      setApiStatus: (apiName, payload) => {
        options.statusPanel?.updateApi(apiName, payload);
      },
    }),
    onCategoryError: (categoryKey, error) => {
      console.error(`[App] News category ${categoryKey} failed:`, error);
    },
  });

  const intelNews = await loadIntelNewsFlow({
    siteVariant: SITE_VARIANT,
    intelSources: INTEL_SOURCES,
    panel: options.newsPanels['intel'],
    disabledSources: options.disabledSources,
    flashMapForNews,
    setFeedStatus: (feedName, payload) => {
      options.statusPanel?.updateFeed(feedName, payload);
    },
    onError: (error) => {
      console.error('[App] Intel feed failed:', error);
    },
  });
  collectedNews.push(...intelNews);

  finalizeNewsLoadStateFlow({
    collectedNews,
    setAllNews: options.setAllNews,
    setInitialLoadComplete: options.setInitialLoadComplete,
    updateHotspotActivity: (news) => {
      options.map?.updateHotspotActivity(news);
    },
    updateMonitorResults: options.updateMonitorResults,
  });

  await clusterNewsResultsFlow({
    allNews: collectedNews,
    setLatestClusters: options.setLatestClusters,
    updateInsights: options.updateInsights,
    setNewsLocations: options.setNewsLocations,
  });
}
