import type { MapLayers } from '@/types';

export type LoadableLayer = keyof MapLayers;

interface LayerLoadActions {
  loadNatural: () => Promise<void>;
  loadFirmsData: () => Promise<void>;
  loadWeatherAlerts: () => Promise<void>;
  loadOutages: () => Promise<void>;
  loadAisSignals: () => Promise<void>;
  loadCableActivity: () => Promise<void>;
  loadProtests: () => Promise<void>;
  loadFlightDelays: () => Promise<void>;
  loadMilitary: () => Promise<void>;
  loadTechEvents: () => Promise<void>;
  loadIntelligenceSignals: () => Promise<void>;
}

export async function dispatchLayerLoad(
  layer: LoadableLayer,
  actions: LayerLoadActions
): Promise<void> {
  switch (layer) {
    case 'natural':
      await actions.loadNatural();
      break;
    case 'fires':
      await actions.loadFirmsData();
      break;
    case 'weather':
      await actions.loadWeatherAlerts();
      break;
    case 'outages':
      await actions.loadOutages();
      break;
    case 'ais':
      await actions.loadAisSignals();
      break;
    case 'cables':
      await actions.loadCableActivity();
      break;
    case 'protests':
      await actions.loadProtests();
      break;
    case 'flights':
      await actions.loadFlightDelays();
      break;
    case 'military':
      await actions.loadMilitary();
      break;
    case 'techEvents':
      await actions.loadTechEvents();
      break;
    case 'ucdpEvents':
    case 'displacement':
    case 'climate':
      await actions.loadIntelligenceSignals();
      break;
    default:
      break;
  }
}
