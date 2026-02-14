import { ArcLayer, ScatterplotLayer } from '@deck.gl/layers';
import { HeatmapLayer } from '@deck.gl/aggregation-layers';
import type { UcdpGeoEvent, DisplacementFlow, ClimateAnomaly } from '@/types';

export type RgbaColor = [number, number, number, number];

export interface UcdpLayerColors {
  stateBased: RgbaColor;
  nonState: RgbaColor;
  oneSided: RgbaColor;
}

export function createUcdpEventsScatterLayer(
  events: UcdpGeoEvent[],
  colors: UcdpLayerColors,
): ScatterplotLayer<UcdpGeoEvent> {
  return new ScatterplotLayer<UcdpGeoEvent>({
    id: 'ucdp-events-layer',
    data: events,
    getPosition: (d) => [d.longitude, d.latitude],
    getRadius: (d) => Math.max(4000, Math.sqrt(d.deaths_best || 1) * 3000),
    getFillColor: (d) => {
      switch (d.type_of_violence) {
        case 'state-based':
          return colors.stateBased;
        case 'non-state':
          return colors.nonState;
        case 'one-sided':
          return colors.oneSided;
        default:
          return colors.stateBased;
      }
    },
    radiusMinPixels: 3,
    radiusMaxPixels: 20,
    pickable: false,
  });
}

export function createDisplacementArcsLayer(
  displacementFlows: DisplacementFlow[],
): ArcLayer<DisplacementFlow> {
  const withCoords = displacementFlows.filter((f) => f.originLat != null && f.asylumLat != null);
  const top50 = withCoords.slice(0, 50);
  const maxCount = Math.max(1, ...top50.map((f) => f.refugees));

  return new ArcLayer<DisplacementFlow>({
    id: 'displacement-arcs-layer',
    data: top50,
    getSourcePosition: (d) => [d.originLon!, d.originLat!],
    getTargetPosition: (d) => [d.asylumLon!, d.asylumLat!],
    getSourceColor: [100, 150, 255, 180],
    getTargetColor: [100, 255, 200, 180],
    getWidth: (d) => Math.max(1, (d.refugees / maxCount) * 8),
    widthMinPixels: 1,
    widthMaxPixels: 8,
    pickable: false,
  });
}

export function createClimateHeatmapLayer(
  climateAnomalies: ClimateAnomaly[],
): HeatmapLayer<ClimateAnomaly> {
  return new HeatmapLayer<ClimateAnomaly>({
    id: 'climate-heatmap-layer',
    data: climateAnomalies,
    getPosition: (d) => [d.lon, d.lat],
    getWeight: (d) => Math.abs(d.tempDelta) + Math.abs(d.precipDelta) * 0.1,
    radiusPixels: 80,
    intensity: 1.5,
    threshold: 0.1,
    colorRange: [
      [68, 136, 255],
      [100, 200, 255],
      [255, 255, 100],
      [255, 200, 50],
      [255, 100, 50],
      [255, 50, 50],
    ],
    pickable: false,
  });
}
