import type { GlobalMapView } from './types';

export interface DeckViewPreset {
  longitude: number;
  latitude: number;
  zoom: number;
}

export interface SvgViewPreset {
  zoom: number;
  pan: { x: number; y: number };
}

export const DECK_VIEW_PRESETS: Record<GlobalMapView, DeckViewPreset> = {
  global: { longitude: 0, latitude: 20, zoom: 1.5 },
  america: { longitude: -95, latitude: 38, zoom: 3 },
  mena: { longitude: 45, latitude: 28, zoom: 3.5 },
  eu: { longitude: 15, latitude: 50, zoom: 3.5 },
  asia: { longitude: 105, latitude: 35, zoom: 3 },
  latam: { longitude: -60, latitude: -15, zoom: 3 },
  africa: { longitude: 20, latitude: 5, zoom: 3 },
  oceania: { longitude: 135, latitude: -25, zoom: 3.5 },
};

export const SVG_VIEW_PRESETS: Record<GlobalMapView, SvgViewPreset> = {
  global: { zoom: 1, pan: { x: 0, y: 0 } },
  america: { zoom: 1.8, pan: { x: 180, y: 30 } },
  mena: { zoom: 3.5, pan: { x: -100, y: 50 } },
  eu: { zoom: 2.4, pan: { x: -30, y: 100 } },
  asia: { zoom: 2.0, pan: { x: -320, y: 40 } },
  latam: { zoom: 2.0, pan: { x: 120, y: -100 } },
  africa: { zoom: 2.2, pan: { x: -40, y: -30 } },
  oceania: { zoom: 2.2, pan: { x: -420, y: -100 } },
};
