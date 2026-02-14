import { GeoJsonLayer, ScatterplotLayer } from '@deck.gl/layers';
import type { Hotspot } from '@/types';
import { CONFLICT_ZONES } from '@/config';

export type RgbaColor = [number, number, number, number];

export interface ConflictLayerColors {
  fill: RgbaColor;
  stroke: RgbaColor;
}

export interface HotspotLayerPoint extends Hotspot {
  hasBreaking?: boolean;
}

export function createConflictZonesGeoLayer(colors: ConflictLayerColors): GeoJsonLayer {
  const geojsonData = {
    type: 'FeatureCollection' as const,
    features: CONFLICT_ZONES.map((zone) => ({
      type: 'Feature' as const,
      properties: { id: zone.id, name: zone.name, intensity: zone.intensity },
      geometry: {
        type: 'Polygon' as const,
        coordinates: [zone.coords],
      },
    })),
  };

  return new GeoJsonLayer({
    id: 'conflict-zones-layer',
    data: geojsonData,
    filled: true,
    stroked: true,
    getFillColor: () => colors.fill,
    getLineColor: () => colors.stroke,
    getLineWidth: 2,
    lineWidthMinPixels: 1,
    pickable: true,
  });
}

export function createHotspotsScatterLayer(
  hotspots: HotspotLayerPoint[],
  zoom: number,
): ScatterplotLayer<HotspotLayerPoint> {
  const lowMediumHotspots = hotspots.filter((h) => h.level !== 'high' && !h.hasBreaking);
  const zoomScale = Math.min(1, (zoom - 1) / 3);
  const maxPx = 6 + Math.round(14 * zoomScale);
  const baseOpacity = zoom < 2.5 ? 0.5 : zoom < 4 ? 0.7 : 1.0;

  return new ScatterplotLayer({
    id: 'hotspots-layer',
    data: lowMediumHotspots,
    getPosition: (d) => [d.lon, d.lat],
    getRadius: (d) => {
      const score = d.escalationScore || 1;
      return 10000 + score * 5000;
    },
    getFillColor: (d) => {
      const score = d.escalationScore || 1;
      const alpha = Math.round((score >= 4 ? 200 : score >= 2 ? 200 : 180) * baseOpacity);
      if (score >= 4) return [255, 68, 68, alpha] as RgbaColor;
      if (score >= 2) return [255, 165, 0, alpha] as RgbaColor;
      return [255, 255, 0, alpha] as RgbaColor;
    },
    radiusMinPixels: 4,
    radiusMaxPixels: maxPx,
    pickable: true,
    stroked: true,
    getLineColor: (d) =>
      d.hasBreaking ? ([255, 255, 255, 255] as RgbaColor) : ([0, 0, 0, 0] as RgbaColor),
    lineWidthMinPixels: 2,
  });
}
