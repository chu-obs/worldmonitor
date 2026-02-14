import type { Layer } from '@deck.gl/core';
import { PathLayer } from '@deck.gl/layers';
import { PIPELINES, PIPELINE_COLORS, UNDERSEA_CABLES } from '@/config';

export type RgbaColor = [number, number, number, number];

interface CablesPathLayerOptions {
  highlightedIds: Set<string>;
  highlightSignature: string;
  lastHighlightSignature: string;
  cachedLayer?: Layer;
  cableColor: RgbaColor;
  cableHighlightColor: RgbaColor;
}

interface PipelinesPathLayerOptions {
  highlightedIds: Set<string>;
  highlightSignature: string;
  lastHighlightSignature: string;
  cachedLayer?: Layer;
}

interface PathLayerResult {
  layer: Layer;
  signature: string;
}

function hexToRgba(hex: string, alpha: number): RgbaColor {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (result && result[1] && result[2] && result[3]) {
    return [
      parseInt(result[1], 16),
      parseInt(result[2], 16),
      parseInt(result[3], 16),
      alpha,
    ];
  }
  return [100, 100, 100, alpha];
}

export function createCablesPathLayer(options: CablesPathLayerOptions): PathLayerResult {
  if (options.cachedLayer && options.highlightSignature === options.lastHighlightSignature) {
    return { layer: options.cachedLayer, signature: options.lastHighlightSignature };
  }

  const layer = new PathLayer({
    id: 'cables-layer',
    data: UNDERSEA_CABLES,
    getPath: (d) => d.points,
    getColor: (d) =>
      options.highlightedIds.has(d.id) ? options.cableHighlightColor : options.cableColor,
    getWidth: (d) => (options.highlightedIds.has(d.id) ? 3 : 1),
    widthMinPixels: 1,
    widthMaxPixels: 5,
    pickable: true,
    updateTriggers: { highlighted: options.highlightSignature },
  });

  return { layer, signature: options.highlightSignature };
}

export function createPipelinesPathLayer(options: PipelinesPathLayerOptions): PathLayerResult {
  if (options.cachedLayer && options.highlightSignature === options.lastHighlightSignature) {
    return { layer: options.cachedLayer, signature: options.lastHighlightSignature };
  }

  const layer = new PathLayer({
    id: 'pipelines-layer',
    data: PIPELINES,
    getPath: (d) => d.points,
    getColor: (d) => {
      if (options.highlightedIds.has(d.id)) {
        return [255, 100, 100, 200] as RgbaColor;
      }
      const colorKey = d.type as keyof typeof PIPELINE_COLORS;
      const hex = PIPELINE_COLORS[colorKey] || '#666666';
      return hexToRgba(hex, 150);
    },
    getWidth: (d) => (options.highlightedIds.has(d.id) ? 3 : 1.5),
    widthMinPixels: 1,
    widthMaxPixels: 4,
    pickable: true,
    updateTriggers: { highlighted: options.highlightSignature },
  });

  return { layer, signature: options.highlightSignature };
}
