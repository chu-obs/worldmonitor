import { COMMODITIES, MARKET_SYMBOLS, SECTORS } from '@/config';
import { fetchCrypto, fetchMultipleStocks } from '@/services';
import type { CryptoData, MarketData } from '@/types';

interface ApiStatusPayload {
  status: 'ok' | 'warning' | 'error';
}

interface MarketPanelLike {
  renderMarkets: (markets: MarketData[]) => void;
}

interface HeatmapPanelLike {
  renderHeatmap: (items: Array<{ name: string; change: number | null }>) => void;
}

interface CommoditiesPanelLike {
  renderCommodities: (items: Array<{
    display: string;
    price: number | null;
    change: number | null;
    sparkline?: number[];
  }>) => void;
}

interface CryptoPanelLike {
  renderCrypto: (items: CryptoData[]) => void;
}

interface LoadMarketsFlowOptions {
  marketPanel: MarketPanelLike | null;
  heatmapPanel: HeatmapPanelLike | null;
  commoditiesPanel: CommoditiesPanelLike | null;
  cryptoPanel: CryptoPanelLike | null;
  setLatestMarkets: (markets: MarketData[]) => void;
  setApiStatus: (apiName: string, payload: ApiStatusPayload) => void;
}

export async function loadMarketsFlow(options: LoadMarketsFlowOptions): Promise<void> {
  try {
    // Stocks
    const stocks = await fetchMultipleStocks(MARKET_SYMBOLS, {
      onBatch: (partialStocks) => {
        options.setLatestMarkets(partialStocks);
        options.marketPanel?.renderMarkets(partialStocks);
      },
    });
    options.setLatestMarkets(stocks);
    options.marketPanel?.renderMarkets(stocks);
    options.setApiStatus('Finnhub', { status: 'ok' });

    // Sectors
    const sectors = await fetchMultipleStocks(
      SECTORS.map((sector) => ({ ...sector, display: sector.name })),
      {
        onBatch: (partialSectors) => {
          options.heatmapPanel?.renderHeatmap(
            partialSectors.map((sector) => ({ name: sector.name, change: sector.change }))
          );
        },
      }
    );
    options.heatmapPanel?.renderHeatmap(
      sectors.map((sector) => ({ name: sector.name, change: sector.change }))
    );

    // Commodities
    const commodities = await fetchMultipleStocks(COMMODITIES, {
      onBatch: (partialCommodities) => {
        options.commoditiesPanel?.renderCommodities(
          partialCommodities.map((commodity) => ({
            display: commodity.display,
            price: commodity.price,
            change: commodity.change,
            sparkline: commodity.sparkline,
          }))
        );
      },
    });
    options.commoditiesPanel?.renderCommodities(
      commodities.map((commodity) => ({
        display: commodity.display,
        price: commodity.price,
        change: commodity.change,
        sparkline: commodity.sparkline,
      }))
    );
  } catch {
    options.setApiStatus('Finnhub', { status: 'error' });
  }

  try {
    // Crypto
    const crypto = await fetchCrypto();
    options.cryptoPanel?.renderCrypto(crypto);
    options.setApiStatus('CoinGecko', { status: 'ok' });
  } catch {
    options.setApiStatus('CoinGecko', { status: 'error' });
  }
}
