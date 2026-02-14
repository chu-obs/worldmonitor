import type { MapLayers, MarketData, NewsItem, PredictionMarket } from '@/types';
import type { SearchResult } from '@/components/SearchModal';
import { SearchModal } from '@/components';
import { getSearchModalStaticOptions, registerStaticSearchSources } from '@/app/panels/search-index/static-sources';
import { refreshDynamicSearchSources } from '@/app/panels/search-index/dynamic-sources';
import { dispatchSearchResult } from '@/app/panels/search-index/result-dispatch';
import { wireSearchModalInteractions } from '@/app/panels/search-index/interactions';

interface SetupSearchModalFlowOptions {
  container: HTMLElement;
  siteVariant: string;
  getMapLayers: () => MapLayers;
  getMap: () => Parameters<typeof dispatchSearchResult>[0]['map'];
  getAllNews: () => NewsItem[];
  getLatestPredictions: () => PredictionMarket[];
  getLatestMarkets: () => MarketData[];
}

interface SetupSearchModalFlowResult {
  searchModal: SearchModal;
  keydownHandler: (e: KeyboardEvent) => void;
}

interface UpdateSearchIndexFlowOptions {
  searchModal: SearchModal | null;
  allNews: NewsItem[];
  latestPredictions: PredictionMarket[];
  latestMarkets: MarketData[];
}

function scrollToPanel(panelId: string): void {
  const panel = document.querySelector(`[data-panel="${panelId}"]`);
  if (panel) {
    panel.scrollIntoView({ behavior: 'smooth', block: 'center' });
    panel.classList.add('flash-highlight');
    setTimeout(() => panel.classList.remove('flash-highlight'), 1500);
  }
}

function highlightNewsItem(itemId: string): void {
  setTimeout(() => {
    const item = document.querySelector(`[data-news-id="${itemId}"]`);
    if (item) {
      item.scrollIntoView({ behavior: 'smooth', block: 'center' });
      item.classList.add('flash-highlight');
      setTimeout(() => item.classList.remove('flash-highlight'), 1500);
    }
  }, 100);
}

function dispatchSearchResultFlow(
  result: SearchResult,
  map: Parameters<typeof dispatchSearchResult>[0]['map'],
  mapLayers: MapLayers
): void {
  dispatchSearchResult({
    result,
    map,
    mapLayers,
    scrollToPanel,
    highlightNewsItem,
  });
}

export function updateSearchIndexFlow(options: UpdateSearchIndexFlowOptions): void {
  if (!options.searchModal) return;
  refreshDynamicSearchSources({
    searchModal: options.searchModal,
    allNews: options.allNews,
    latestPredictions: options.latestPredictions,
    latestMarkets: options.latestMarkets,
  });
}

export function setupSearchModalFlow(options: SetupSearchModalFlowOptions): SetupSearchModalFlowResult {
  const searchOptions = getSearchModalStaticOptions(options.siteVariant);
  const searchModal = new SearchModal(options.container, searchOptions);
  registerStaticSearchSources(searchModal, options.siteVariant);
  const keydownHandler = wireSearchModalInteractions({
    searchModal,
    onSelect: (result) => {
      dispatchSearchResultFlow(result, options.getMap(), options.getMapLayers());
    },
    updateSearchIndex: () => {
      updateSearchIndexFlow({
        searchModal,
        allNews: options.getAllNews(),
        latestPredictions: options.getLatestPredictions(),
        latestMarkets: options.getLatestMarkets(),
      });
    },
  });

  return {
    searchModal,
    keydownHandler,
  };
}
