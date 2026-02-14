import type { ClusteredEvent, PredictionMarket } from '@/types';
import type { TheaterPostureSummary } from '@/services/military-surge';
import { dataFreshness } from '@/services/data-freshness';
import { signalAggregator } from '@/services/signal-aggregator';
import { collectStoryData } from '@/services/story-data';
import { openStoryModal } from '@/components/StoryModal';
import { computeCountrySignals, type IntelligenceCache } from '@/app/state/country-signals';

interface OpenCountryStoryFlowOptions {
  code: string;
  name: string;
  intelligenceCache: IntelligenceCache;
  latestClusters: ClusteredEvent[];
  latestPredictions: PredictionMarket[];
  postures: TheaterPostureSummary[];
  onNotReady?: () => void;
}

export function openCountryStoryFlow(options: OpenCountryStoryFlowOptions): boolean {
  if (!dataFreshness.hasSufficientData() || options.latestClusters.length === 0) {
    options.onNotReady?.();
    return false;
  }

  const signals = computeCountrySignals(options.intelligenceCache, options.code, options.name);
  const cluster = signalAggregator.getCountryClusters().find((item) => item.country === options.code);
  const regional = signalAggregator
    .getRegionalConvergence()
    .filter((item) => item.countries.includes(options.code));

  const convergence = cluster
    ? {
        score: cluster.convergenceScore,
        signalTypes: [...cluster.signalTypes],
        regionalDescriptions: regional.map((item) => item.description),
      }
    : null;

  const data = collectStoryData(
    options.code,
    options.name,
    options.latestClusters,
    options.postures,
    options.latestPredictions,
    signals,
    convergence
  );
  openStoryModal(data);
  return true;
}
