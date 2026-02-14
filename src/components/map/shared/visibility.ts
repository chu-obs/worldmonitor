import type { MapLayers } from '@/types';
import type { LayerZoomThresholds } from './layer-thresholds';

export function isLayerVisibleAtZoom(
  layer: keyof MapLayers,
  zoom: number,
  thresholds: LayerZoomThresholds,
): boolean {
  const threshold = thresholds[layer];
  if (!threshold) return true;
  return zoom >= threshold.minZoom;
}

export function shouldSetLayerZoomOverride(
  layer: keyof MapLayers,
  zoom: number,
  thresholds: LayerZoomThresholds,
): boolean {
  const threshold = thresholds[layer];
  return Boolean(threshold && zoom < threshold.minZoom);
}

export interface LayerZoomVisibilityState {
  autoHidden: boolean;
  isVisible: boolean;
  labelsVisible: boolean;
}

export function getLayerZoomVisibilityState(
  layer: keyof MapLayers,
  zoom: number,
  enabled: boolean,
  override: boolean,
  thresholds: LayerZoomThresholds,
): LayerZoomVisibilityState {
  const threshold = thresholds[layer];
  if (!threshold) {
    return {
      autoHidden: false,
      isVisible: enabled,
      labelsVisible: enabled,
    };
  }

  const isVisible = enabled && (override || zoom >= threshold.minZoom);
  const labelZoom = threshold.showLabels ?? threshold.minZoom;
  const labelsVisible = enabled && zoom >= labelZoom;
  const autoHidden = enabled && !override && zoom < threshold.minZoom;

  return { autoHidden, isVisible, labelsVisible };
}
