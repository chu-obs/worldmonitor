import type { NewsItem } from '@/types';
import { fetchCountryMarkets } from '@/services/polymarket';
import { signalAggregator } from '@/services/signal-aggregator';
import { calculateCII } from '@/services/country-instability';
import { getCountrySearchTerms } from '@/app/state/country-metadata';
import { computeCountrySignals, type IntelligenceCache } from '@/app/state/country-signals';
import { reverseGeocode } from '@/utils/reverse-geocode';
import { CountryIntelModal, type StockIndexData } from '@/components/CountryIntelModal';

interface CountryIntelMapAdapter {
  onCountryClicked: (callback: (lat: number, lon: number) => void) => void;
  setRenderPaused: (paused: boolean) => void;
  highlightCountry: (code: string) => void;
  clearCountryHighlight: () => void;
}

interface CountryIntelGeoResult {
  country: string;
  code: string;
}

interface CountryIntelFlowOptions {
  map: CountryIntelMapAdapter;
  modal: CountryIntelModal;
  onShareStory: (code: string, name: string) => void;
  getIntelligenceCache: () => IntelligenceCache;
  getAllNews: () => NewsItem[];
  fetchImpl?: typeof fetch;
}

interface StockIndexUnavailable {
  available: false;
}

type StockIndexResult = StockIndexData | StockIndexUnavailable;

interface CountryIntelBriefResponse {
  brief: string;
  country: string;
  cached?: boolean;
  generatedAt?: string;
  error?: string;
}

function collectCountryHeadlines(news: NewsItem[], country: string, code: string): string[] {
  const searchTerms = getCountrySearchTerms(country, code);
  return news
    .filter((item) => {
      const title = item.title.toLowerCase();
      return searchTerms.some((term) => title.includes(term));
    })
    .slice(0, 15)
    .map((item) => item.title);
}

function buildCountryIntelContext(
  geo: CountryIntelGeoResult,
  score: ReturnType<typeof calculateCII>[number] | null,
  signals: ReturnType<typeof computeCountrySignals>,
  allNews: NewsItem[]
): Record<string, unknown> {
  const context: Record<string, unknown> = {};

  if (score) {
    context.score = score.score;
    context.level = score.level;
    context.trend = score.trend;
    context.components = score.components;
    context.change24h = score.change24h;
  }

  Object.assign(context, signals);

  const countryCluster = signalAggregator.getCountryClusters().find((cluster) => cluster.country === geo.code);
  if (countryCluster) {
    context.convergenceScore = countryCluster.convergenceScore;
    context.signalTypes = [...countryCluster.signalTypes];
  }

  const convergences = signalAggregator.getRegionalConvergence()
    .filter((region) => region.countries.includes(geo.code));
  if (convergences.length) {
    context.regionalConvergence = convergences.map((region) => region.description);
  }

  const headlines = collectCountryHeadlines(allNews, geo.country, geo.code);
  if (headlines.length) {
    context.headlines = headlines;
  }

  return context;
}

async function fetchStockIndex(fetchImpl: typeof fetch, countryCode: string): Promise<StockIndexResult> {
  try {
    const res = await fetchImpl(`/api/stock-index?code=${encodeURIComponent(countryCode)}`);
    return await res.json();
  } catch {
    return { available: false };
  }
}

async function fetchCountryIntelBrief(
  fetchImpl: typeof fetch,
  geo: CountryIntelGeoResult,
  context: Record<string, unknown>
): Promise<CountryIntelBriefResponse> {
  const res = await fetchImpl('/api/country-intel', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ country: geo.country, code: geo.code, context }),
  });
  return res.json() as Promise<CountryIntelBriefResponse>;
}

export function setupCountryIntelFlow(options: CountryIntelFlowOptions): void {
  const fetchImpl = options.fetchImpl || fetch;
  const { map, modal } = options;

  modal.setShareStoryHandler((code, name) => {
    modal.hide();
    options.onShareStory(code, name);
  });

  map.onCountryClicked(async (lat, lon) => {
    modal.showLoading();
    map.setRenderPaused(true);

    const geo = await reverseGeocode(lat, lon);
    if (!geo) {
      modal.hide();
      map.setRenderPaused(false);
      return;
    }

    const score = calculateCII().find((item) => item.code === geo.code) ?? null;
    const signals = computeCountrySignals(options.getIntelligenceCache(), geo.code, geo.country);
    modal.show(geo.country, geo.code, score, signals);
    map.highlightCountry(geo.code);

    const stockPromise = fetchStockIndex(fetchImpl, geo.code);
    stockPromise.then((stock) => {
      modal.updateStock(stock as StockIndexData);
    });

    fetchCountryMarkets(geo.country)
      .then((markets) => modal.updateMarkets(markets))
      .catch(() => modal.updateMarkets([]));

    try {
      const context = buildCountryIntelContext(geo, score, signals, options.getAllNews());

      const stockData = await stockPromise;
      if (stockData.available) {
        const pct = parseFloat(stockData.weekChangePercent);
        context.stockIndex = `${stockData.indexName}: ${stockData.price} (${pct >= 0 ? '+' : ''}${stockData.weekChangePercent}% week)`;
      }

      const data = await fetchCountryIntelBrief(fetchImpl, geo, context);
      modal.updateBrief({ ...data, code: geo.code });
    } catch (error) {
      console.error('[CountryIntel] fetch error:', error);
      modal.updateBrief({
        brief: '',
        country: geo.country,
        code: geo.code,
        error: 'Failed to generate brief',
      });
    }
  });

  modal.onClose(() => {
    map.clearCountryHighlight();
    map.setRenderPaused(false);
  });
}
