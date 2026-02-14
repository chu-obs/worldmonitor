import type { DeviationLevel, Feed, NewsItem } from '@/types';
import { fetchCategoryFeeds, updateBaseline, calculateDeviation } from '@/services';

export interface NewsCategoryConfig {
  key: string;
  feeds: Feed[];
}

interface NewsPanelLike {
  showError: (message: string) => void;
  renderNews: (items: NewsItem[]) => void;
  setDeviation: (zScore: number, percentChange: number, level: DeviationLevel) => void;
}

interface FeedStatusPayload {
  status: 'ok' | 'warning' | 'error';
  itemCount?: number;
  errorMessage?: string;
}

interface ApiStatusPayload {
  status: 'ok' | 'warning' | 'error';
}

interface LoadNewsCategoryFlowOptions {
  category: string;
  feeds: Feed[];
  panel?: NewsPanelLike;
  disabledSources: Set<string>;
  flashMapForNews: (items: NewsItem[]) => void;
  setFeedStatus: (feedName: string, payload: FeedStatusPayload) => void;
  setApiStatus: (apiName: string, payload: ApiStatusPayload) => void;
}

interface CollectCategoryNewsOptions {
  categories: NewsCategoryConfig[];
  loadCategory: (category: NewsCategoryConfig) => Promise<NewsItem[]>;
  onCategoryError?: (categoryKey: string, error: unknown) => void;
}

interface LoadIntelNewsFlowOptions {
  siteVariant: string;
  intelSources: Feed[];
  panel?: NewsPanelLike;
  disabledSources: Set<string>;
  flashMapForNews: (items: NewsItem[]) => void;
  setFeedStatus: (feedName: string, payload: FeedStatusPayload) => void;
  onError?: (error: unknown) => void;
}

const NEWS_CATEGORY_KEYS = [
  'politics',
  'tech',
  'finance',
  'gov',
  'middleeast',
  'africa',
  'latam',
  'asia',
  'energy',
  'layoffs',
  'ai',
  'thinktanks',
  'startups',
  'vcblogs',
  'regionalStartups',
  'unicorns',
  'accelerators',
  'funding',
  'producthunt',
  'security',
  'policy',
  'hardware',
  'cloud',
  'dev',
  'github',
  'ipo',
] as const;

function toFeedLabel(category: string): string {
  return category.charAt(0).toUpperCase() + category.slice(1);
}

export function getConfiguredNewsCategories(
  feedsByKey: Record<string, Feed[] | undefined>
): NewsCategoryConfig[] {
  return NEWS_CATEGORY_KEYS
    .map((key) => ({ key, feeds: feedsByKey[key] || [] }))
    .filter((category) => category.feeds.length > 0);
}

export async function loadNewsCategoryFlow(options: LoadNewsCategoryFlowOptions): Promise<NewsItem[]> {
  const feedLabel = toFeedLabel(options.category);
  const renderIntervalMs = 250;
  let lastRenderTime = 0;
  let renderTimeout: ReturnType<typeof setTimeout> | null = null;
  let pendingItems: NewsItem[] | null = null;

  try {
    const enabledFeeds = options.feeds.filter((feed) => !options.disabledSources.has(feed.name));
    if (enabledFeeds.length === 0) {
      options.panel?.showError('All sources disabled');
      options.setFeedStatus(feedLabel, { status: 'ok', itemCount: 0 });
      return [];
    }

    const flushPendingRender = () => {
      if (!options.panel || !pendingItems) return;
      options.panel.renderNews(pendingItems);
      pendingItems = null;
      lastRenderTime = Date.now();
    };

    const scheduleRender = (partialItems: NewsItem[]) => {
      if (!options.panel) return;
      pendingItems = partialItems;
      const elapsed = Date.now() - lastRenderTime;
      if (elapsed >= renderIntervalMs) {
        if (renderTimeout) {
          clearTimeout(renderTimeout);
          renderTimeout = null;
        }
        flushPendingRender();
        return;
      }

      if (!renderTimeout) {
        renderTimeout = setTimeout(() => {
          renderTimeout = null;
          flushPendingRender();
        }, renderIntervalMs - elapsed);
      }
    };

    const items = await fetchCategoryFeeds(enabledFeeds, {
      onBatch: (partialItems) => {
        scheduleRender(partialItems);
        options.flashMapForNews(partialItems);
      },
    });

    if (options.panel) {
      if (renderTimeout) {
        clearTimeout(renderTimeout);
        renderTimeout = null;
        pendingItems = null;
      }
      options.panel.renderNews(items);

      const baseline = await updateBaseline(`news:${options.category}`, items.length);
      const deviation = calculateDeviation(items.length, baseline);
      options.panel.setDeviation(deviation.zScore, deviation.percentChange, deviation.level);
    }

    options.setFeedStatus(feedLabel, { status: 'ok', itemCount: items.length });
    options.setApiStatus('RSS2JSON', { status: 'ok' });
    return items;
  } catch (error) {
    options.setFeedStatus(feedLabel, { status: 'error', errorMessage: String(error) });
    options.setApiStatus('RSS2JSON', { status: 'error' });
    return [];
  } finally {
    if (renderTimeout) {
      clearTimeout(renderTimeout);
    }
  }
}

export async function collectCategoryNews(options: CollectCategoryNewsOptions): Promise<NewsItem[]> {
  const results = await Promise.allSettled(
    options.categories.map((category) => options.loadCategory(category))
  );

  const collected: NewsItem[] = [];
  results.forEach((result, idx) => {
    if (result.status === 'fulfilled') {
      collected.push(...result.value);
    } else {
      options.onCategoryError?.(options.categories[idx]?.key || 'unknown', result.reason);
    }
  });

  return collected;
}

export async function loadIntelNewsFlow(options: LoadIntelNewsFlowOptions): Promise<NewsItem[]> {
  if (options.siteVariant !== 'full') {
    return [];
  }

  const enabledIntelSources = options.intelSources.filter(
    (source) => !options.disabledSources.has(source.name)
  );
  if (enabledIntelSources.length === 0) {
    options.panel?.showError('All Intel sources disabled');
    options.setFeedStatus('Intel', { status: 'ok', itemCount: 0 });
    return [];
  }

  try {
    const intelItems = await fetchCategoryFeeds(enabledIntelSources);
    if (options.panel) {
      options.panel.renderNews(intelItems);
      const baseline = await updateBaseline('news:intel', intelItems.length);
      const deviation = calculateDeviation(intelItems.length, baseline);
      options.panel.setDeviation(deviation.zScore, deviation.percentChange, deviation.level);
    }
    options.setFeedStatus('Intel', { status: 'ok', itemCount: intelItems.length });
    options.flashMapForNews(intelItems);
    return intelItems;
  } catch (error) {
    options.onError?.(error);
    return [];
  }
}
