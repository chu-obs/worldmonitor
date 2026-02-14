import type { MapLayers } from '@/types';
import { parseMapUrlState, type ParsedMapUrlState } from '@/utils';
import type { MapView, TimeRange } from '@/components';

const DISABLED_TECH_URL_LAYERS: (keyof MapLayers)[] = [
  'conflicts',
  'bases',
  'hotspots',
  'nuclear',
  'irradiators',
  'sanctions',
  'military',
  'protests',
  'pipelines',
  'waterways',
  'ais',
  'flights',
  'spaceports',
  'minerals',
];

interface UrlStateMapAdapter {
  setView: (view: MapView) => void;
  setTimeRange: (range: TimeRange) => void;
  setLayers: (layers: MapLayers) => void;
  setZoom: (zoom: number) => void;
  setCenter: (lat: number, lon: number) => void;
  getState: () => { view: MapView };
}

interface ApplyInitialUrlStateOptions {
  initialUrlState: ParsedMapUrlState | null;
  map: UrlStateMapAdapter | null;
  onLayersResolved?: (layers: MapLayers) => void;
  regionSelect?: HTMLSelectElement | null;
}

export function resolveInitialUrlState(
  search: string,
  fallbackLayers: MapLayers,
  currentVariant: string
): ParsedMapUrlState {
  const parsed = parseMapUrlState(search, fallbackLayers);
  if (!parsed.layers || currentVariant !== 'tech') return parsed;

  const layers = { ...parsed.layers };
  DISABLED_TECH_URL_LAYERS.forEach((layer) => {
    layers[layer] = false;
  });

  return {
    ...parsed,
    layers,
  };
}

export function applyInitialUrlStateToMap(options: ApplyInitialUrlStateOptions): void {
  const { initialUrlState, map, onLayersResolved, regionSelect } = options;
  if (!initialUrlState || !map) return;

  const { view, zoom, lat, lon, timeRange, layers } = initialUrlState;

  if (view) {
    map.setView(view);
  }

  if (timeRange) {
    map.setTimeRange(timeRange);
  }

  if (layers) {
    onLayersResolved?.(layers);
    map.setLayers(layers);
  }

  // Only apply custom lat/lon/zoom if no view preset is specified.
  if (!view) {
    if (zoom !== undefined) {
      map.setZoom(zoom);
    }

    // At low zoom levels keep centered world view to avoid clipping.
    if (lat !== undefined && lon !== undefined && zoom !== undefined && zoom > 2) {
      map.setCenter(lat, lon);
    }
  }

  const currentView = map.getState().view;
  if (regionSelect && currentView) {
    regionSelect.value = currentView;
  }
}
