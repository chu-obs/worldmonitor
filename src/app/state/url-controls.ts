import type { MapLayers } from '@/types';
import type { ParsedMapUrlState } from '@/utils';
import type { MapContainer } from '@/components';
import { applyInitialUrlStateToMap } from '@/app/state/url-bootstrap';
import { setupUrlStateSync } from '@/app/state/url-sync';

interface ApplyInitialUrlStateFlowOptions {
  initialUrlState: ParsedMapUrlState | null;
  map: MapContainer | null;
  regionSelect: HTMLSelectElement | null;
  onLayersResolved: (layers: MapLayers) => void;
}

interface SetupUrlSyncFlowOptions {
  map: MapContainer | null;
  regionSelect: HTMLSelectElement | null;
  replaceUrl: (url: string) => void;
}

export function applyInitialUrlStateFlow(options: ApplyInitialUrlStateFlowOptions): void {
  applyInitialUrlStateToMap({
    initialUrlState: options.initialUrlState,
    map: options.map,
    onLayersResolved: options.onLayersResolved,
    regionSelect: options.regionSelect,
  });
}

export function setupUrlStateSyncFlow(options: SetupUrlSyncFlowOptions): void {
  if (!options.map) return;
  setupUrlStateSync({
    map: options.map,
    regionSelect: options.regionSelect,
    replaceUrl: options.replaceUrl,
  });
}
