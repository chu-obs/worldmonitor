import type { MapLayers } from '@/types';
import type { MapContainer } from '@/components';
import { buildDefaultLoadPlan } from '@/app/data/default-load-plan';
import { runGuardedTasks } from '@/app/data/guarded-load';
import { dispatchLayerLoad } from '@/app/data/layer-load-dispatch';

interface LoadAllDataActions {
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

interface LoadAllDataFlowOptions {
  mapLayers: MapLayers;
  inFlight: Set<string>;
  actions: LoadAllDataActions;
  onTaskError?: (name: string, error: unknown) => void;
  onSearchIndexUpdate: () => void;
}

interface LoadLayerDataActions {
  loadNatural: () => Promise<void>;
  loadFirmsData: () => Promise<void>;
  loadWeatherAlerts: () => Promise<void>;
  loadOutages: () => Promise<void>;
  loadAisSignals: () => Promise<void>;
  loadCableActivity: () => Promise<void>;
  loadProtests: () => Promise<void>;
  loadFlightDelays: () => Promise<void>;
  loadMilitary: () => Promise<void>;
  loadTechEvents: () => Promise<void>;
  loadIntelligenceSignals: () => Promise<void>;
}

interface LoadDataForLayerFlowOptions {
  layer: keyof MapLayers;
  inFlight: Set<string>;
  map: MapContainer | null;
  actions: LoadLayerDataActions;
}

export async function loadAllDataFlow(options: LoadAllDataFlowOptions): Promise<void> {
  const tasks = buildDefaultLoadPlan(options.mapLayers, options.actions);
  await runGuardedTasks({
    inFlight: options.inFlight,
    tasks,
    onTaskError: options.onTaskError,
  });
  options.onSearchIndexUpdate();
}

export async function loadDataForLayerFlow(options: LoadDataForLayerFlowOptions): Promise<void> {
  if (options.inFlight.has(options.layer)) return;
  options.inFlight.add(options.layer);
  options.map?.setLayerLoading(options.layer, true);
  try {
    await dispatchLayerLoad(options.layer, options.actions);
  } finally {
    options.inFlight.delete(options.layer);
    options.map?.setLayerLoading(options.layer, false);
  }
}
