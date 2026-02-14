import type { MapLayers } from '@/types';
import type { MapView, TimeRange } from '@/components';
import { buildMapUrl, debounce } from '@/utils';

interface UrlSyncMapState {
  view: MapView;
  zoom: number;
  timeRange: TimeRange;
  layers: MapLayers;
}

interface UrlSyncMapAdapter {
  getState: () => UrlSyncMapState;
  getCenter: () => { lat: number; lon: number } | null;
  onStateChanged: (handler: () => void) => void;
}

interface SetupUrlStateSyncOptions {
  map: UrlSyncMapAdapter;
  regionSelect?: HTMLSelectElement | null;
  replaceUrl?: (url: string) => void;
  baseUrl?: string;
  debounceMs?: number;
}

export function getShareUrlFromMap(
  map: Pick<UrlSyncMapAdapter, 'getState' | 'getCenter'>,
  baseUrl = `${window.location.origin}${window.location.pathname}`
): string {
  const state = map.getState();
  const center = map.getCenter();
  return buildMapUrl(baseUrl, {
    view: state.view,
    zoom: state.zoom,
    center,
    timeRange: state.timeRange,
    layers: state.layers,
  });
}

export function setupUrlStateSync(options: SetupUrlStateSyncOptions): void {
  const {
    map,
    regionSelect = null,
    debounceMs = 250,
    baseUrl = `${window.location.origin}${window.location.pathname}`,
    replaceUrl = (url) => history.replaceState(null, '', url),
  } = options;

  const update = debounce(() => {
    replaceUrl(getShareUrlFromMap(map, baseUrl));
  }, debounceMs);

  map.onStateChanged(() => {
    update();
    if (regionSelect) {
      const state = map.getState();
      if (regionSelect.value !== state.view) {
        regionSelect.value = state.view;
      }
    }
  });

  update();
}
