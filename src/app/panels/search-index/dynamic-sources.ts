import type { NewsItem, MarketData, PredictionMarket } from '@/types';
import { SearchModal } from '@/components/SearchModal';

interface RefreshDynamicSearchSourcesOptions {
  searchModal: SearchModal;
  allNews: NewsItem[];
  latestPredictions: PredictionMarket[];
  latestMarkets: MarketData[];
}

export function refreshDynamicSearchSources(options: RefreshDynamicSearchSourcesOptions): void {
  const { searchModal, allNews, latestPredictions, latestMarkets } = options;

  // Update news sources (use link as unique id) - index up to 500 items for better search coverage.
  const newsItems = allNews.slice(0, 500).map((item) => ({
    id: item.link,
    title: item.title,
    subtitle: item.source,
    data: item,
  }));
  console.log(`[Search] Indexing ${newsItems.length} news items (allNews total: ${allNews.length})`);
  searchModal.registerSource('news', newsItems);

  // Update predictions if available.
  if (latestPredictions.length > 0) {
    searchModal.registerSource('prediction', latestPredictions.map((prediction) => ({
      id: prediction.title,
      title: prediction.title,
      subtitle: `${(prediction.yesPrice * 100).toFixed(0)}% probability`,
      data: prediction,
    })));
  }

  // Update markets if available.
  if (latestMarkets.length > 0) {
    searchModal.registerSource('market', latestMarkets.map((market) => ({
      id: market.symbol,
      title: `${market.symbol} - ${market.name}`,
      subtitle: `$${market.price?.toFixed(2) || 'N/A'}`,
      data: market,
    })));
  }
}
