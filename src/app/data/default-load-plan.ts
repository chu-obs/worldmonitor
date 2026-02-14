import type { MapLayers } from '@/types';
import { SITE_VARIANT } from '@/config';
import type { GuardedTask } from '@/app/data/guarded-load';

interface DefaultLoadActions {
  loadNews: () => Promise<void>;
  loadMarkets: () => Promise<void>;
  loadPredictions: () => Promise<void>;
  loadPizzInt: () => Promise<void>;
  loadFredData: () => Promise<void>;
  loadOilAnalytics: () => Promise<void>;
  loadGovernmentSpending: () => Promise<void>;
  loadIntelligenceSignals: () => Promise<void>;
  loadFirmsData: () => Promise<void>;
  loadNatural: () => Promise<void>;
  loadWeatherAlerts: () => Promise<void>;
  loadAisSignals: () => Promise<void>;
  loadCableActivity: () => Promise<void>;
  loadFlightDelays: () => Promise<void>;
  loadTechEvents: () => Promise<void>;
  loadTechReadiness: () => Promise<void> | void;
}

export function buildDefaultLoadPlan(
  mapLayers: MapLayers,
  actions: DefaultLoadActions
): GuardedTask[] {
  const tasks: GuardedTask[] = [
    { name: 'news', task: actions.loadNews },
    { name: 'markets', task: actions.loadMarkets },
    { name: 'predictions', task: actions.loadPredictions },
    { name: 'pizzint', task: actions.loadPizzInt },
    { name: 'fred', task: actions.loadFredData },
    { name: 'oil', task: actions.loadOilAnalytics },
    { name: 'spending', task: actions.loadGovernmentSpending },
  ];

  // Load intelligence signals for CII calculation (protests, military, outages)
  // Only for geopolitical variant - tech variant doesn't need CII/focal points
  if (SITE_VARIANT === 'full') {
    tasks.push({ name: 'intelligence', task: actions.loadIntelligenceSignals });
  }

  // Conditionally load non-intelligence layers
  // NOTE: outages, protests, military are handled by loadIntelligenceSignals()
  if (SITE_VARIANT === 'full') tasks.push({ name: 'firms', task: actions.loadFirmsData });
  if (mapLayers.natural) tasks.push({ name: 'natural', task: actions.loadNatural });
  if (mapLayers.weather) tasks.push({ name: 'weather', task: actions.loadWeatherAlerts });
  if (mapLayers.ais) tasks.push({ name: 'ais', task: actions.loadAisSignals });
  if (mapLayers.cables) tasks.push({ name: 'cables', task: actions.loadCableActivity });
  if (mapLayers.flights) tasks.push({ name: 'flights', task: actions.loadFlightDelays });
  if (mapLayers.techEvents || SITE_VARIANT === 'tech') tasks.push({ name: 'techEvents', task: actions.loadTechEvents });

  // Tech Readiness panel (tech variant only)
  if (SITE_VARIANT === 'tech') {
    tasks.push({ name: 'techReadiness', task: actions.loadTechReadiness });
  }

  return tasks;
}
