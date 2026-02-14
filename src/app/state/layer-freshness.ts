import type { DataSourceId } from '@/services/data-freshness';
import type { MapLayers } from '@/types';

const LAYER_TO_SOURCE_IDS: Partial<Record<keyof MapLayers, DataSourceId[]>> = {
  military: ['opensky', 'wingbits'],
  ais: ['ais'],
  natural: ['usgs'],
  weather: ['weather'],
  outages: ['outages'],
  protests: ['acled'],
  ucdpEvents: ['ucdp_events'],
  displacement: ['unhcr'],
  climate: ['climate'],
};

interface SyncLayerFreshnessOptions {
  setEnabled: (sourceId: DataSourceId, enabled: boolean) => void;
}

export function syncAllLayerFreshness(
  mapLayers: MapLayers,
  options: SyncLayerFreshnessOptions
): void {
  for (const [layer, sourceIds] of Object.entries(LAYER_TO_SOURCE_IDS)) {
    const enabled = mapLayers[layer as keyof MapLayers] ?? false;
    if (!sourceIds) continue;
    for (const sourceId of sourceIds) {
      options.setEnabled(sourceId, enabled);
    }
  }
}

export function syncSingleLayerFreshness(
  layer: keyof MapLayers,
  enabled: boolean,
  options: SyncLayerFreshnessOptions
): void {
  const sourceIds = LAYER_TO_SOURCE_IDS[layer];
  if (!sourceIds) return;
  for (const sourceId of sourceIds) {
    options.setEnabled(sourceId, enabled);
  }
}
