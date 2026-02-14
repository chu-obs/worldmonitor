import type { MapLayers } from '@/types';

export type LayerZoomThresholds = Partial<
  Record<keyof MapLayers, { minZoom: number; showLabels?: number }>
>;

export const DECK_LAYER_ZOOM_THRESHOLDS: LayerZoomThresholds = {
  bases: { minZoom: 3, showLabels: 5 },
  nuclear: { minZoom: 3 },
  conflicts: { minZoom: 1, showLabels: 3 },
  economic: { minZoom: 3 },
  natural: { minZoom: 1, showLabels: 2 },
  datacenters: { minZoom: 5 },
  irradiators: { minZoom: 4 },
  spaceports: { minZoom: 3 },
};

export const SVG_LAYER_ZOOM_THRESHOLDS: LayerZoomThresholds = {
  bases: { minZoom: 3, showLabels: 5 },
  nuclear: { minZoom: 2 },
  conflicts: { minZoom: 1, showLabels: 3 },
  economic: { minZoom: 2 },
  natural: { minZoom: 1, showLabels: 2 },
};
