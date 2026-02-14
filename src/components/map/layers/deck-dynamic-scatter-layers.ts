import { ScatterplotLayer } from '@deck.gl/layers';
import type {
  Earthquake,
  InternetOutage,
  AisDisruptionEvent,
  AisDensityZone,
  CableAdvisory,
  RepairShip,
  AirportDelayAlert,
  MilitaryFlight,
  MilitaryVessel,
  MilitaryFlightCluster,
  MilitaryVesselCluster,
  NaturalEvent,
} from '@/types';
import type { WeatherAlert } from '@/services/weather';

export type RgbaColor = [number, number, number, number];

export interface FirmsFirePoint {
  lat: number;
  lon: number;
  brightness: number;
  frp: number;
  confidence: number;
  region: string;
  acq_date: string;
  daynight: string;
}

export function createFlightDelaysScatterLayer(flightDelays: AirportDelayAlert[]): ScatterplotLayer<AirportDelayAlert> {
  return new ScatterplotLayer({
    id: 'flight-delays-layer',
    data: flightDelays,
    getPosition: (d) => [d.lon, d.lat],
    getRadius: (d) => {
      if (d.delayType === 'ground_stop') return 15000;
      if (d.delayType === 'ground_delay') return 12000;
      return 8000;
    },
    getFillColor: (d) => {
      if (d.delayType === 'ground_stop' || d.severity === 'severe') return [255, 50, 50, 200] as RgbaColor;
      if (d.delayType === 'ground_delay' || d.severity === 'major' || d.severity === 'moderate') {
        return [255, 150, 0, 200] as RgbaColor;
      }
      return [255, 200, 100, 180] as RgbaColor;
    },
    radiusMinPixels: 4,
    radiusMaxPixels: 15,
    pickable: true,
  });
}

export function createEarthquakesScatterLayer(
  earthquakes: Earthquake[],
  defaultColor: RgbaColor,
): ScatterplotLayer<Earthquake> {
  return new ScatterplotLayer({
    id: 'earthquakes-layer',
    data: earthquakes,
    getPosition: (d) => [d.lon, d.lat],
    getRadius: (d) => Math.pow(2, d.magnitude) * 1000,
    getFillColor: (d) => {
      const mag = d.magnitude;
      if (mag >= 6) return [255, 0, 0, 200] as RgbaColor;
      if (mag >= 5) return [255, 100, 0, 200] as RgbaColor;
      return defaultColor;
    },
    radiusMinPixels: 4,
    radiusMaxPixels: 30,
    pickable: true,
  });
}

export function createNaturalEventsScatterLayer(events: NaturalEvent[]): ScatterplotLayer<NaturalEvent> {
  return new ScatterplotLayer({
    id: 'natural-events-layer',
    data: events,
    getPosition: (d) => [d.lon, d.lat],
    getRadius: (d) => (d.title.startsWith('🔴') ? 20000 : d.title.startsWith('🟠') ? 15000 : 8000),
    getFillColor: (d) => {
      if (d.title.startsWith('🔴')) return [255, 0, 0, 220] as RgbaColor;
      if (d.title.startsWith('🟠')) return [255, 140, 0, 200] as RgbaColor;
      return [255, 150, 50, 180] as RgbaColor;
    },
    radiusMinPixels: 5,
    radiusMaxPixels: 18,
    pickable: true,
  });
}

export function createFiresScatterLayer(fireData: FirmsFirePoint[]): ScatterplotLayer<FirmsFirePoint> {
  return new ScatterplotLayer({
    id: 'fires-layer',
    data: fireData,
    getPosition: (d) => [d.lon, d.lat],
    getRadius: (d) => Math.min(d.frp * 200, 30000) || 5000,
    getFillColor: (d) => {
      if (d.brightness > 400) return [255, 30, 0, 220] as RgbaColor;
      if (d.brightness > 350) return [255, 140, 0, 200] as RgbaColor;
      return [255, 220, 50, 180] as RgbaColor;
    },
    radiusMinPixels: 3,
    radiusMaxPixels: 12,
    pickable: true,
  });
}

export function createWeatherScatterLayer(
  weatherAlerts: WeatherAlert[],
  defaultColor: RgbaColor,
): ScatterplotLayer<WeatherAlert> {
  const alertsWithCoords = weatherAlerts.filter((a) => a.centroid && a.centroid.length === 2);

  return new ScatterplotLayer({
    id: 'weather-layer',
    data: alertsWithCoords,
    getPosition: (d) => d.centroid as [number, number],
    getRadius: 25000,
    getFillColor: (d) => {
      if (d.severity === 'Extreme') return [255, 0, 0, 200] as RgbaColor;
      if (d.severity === 'Severe') return [255, 100, 0, 180] as RgbaColor;
      if (d.severity === 'Moderate') return [255, 170, 0, 160] as RgbaColor;
      return defaultColor;
    },
    radiusMinPixels: 8,
    radiusMaxPixels: 20,
    pickable: true,
  });
}

export function createOutagesScatterLayer(
  outages: InternetOutage[],
  color: RgbaColor,
): ScatterplotLayer<InternetOutage> {
  return new ScatterplotLayer({
    id: 'outages-layer',
    data: outages,
    getPosition: (d) => [d.lon, d.lat],
    getRadius: 20000,
    getFillColor: color,
    radiusMinPixels: 6,
    radiusMaxPixels: 18,
    pickable: true,
  });
}

export function createAisDensityScatterLayer(density: AisDensityZone[]): ScatterplotLayer<AisDensityZone> {
  return new ScatterplotLayer({
    id: 'ais-density-layer',
    data: density,
    getPosition: (d) => [d.lon, d.lat],
    getRadius: (d) => 4000 + d.intensity * 8000,
    getFillColor: (d) => {
      const intensity = Math.min(Math.max(d.intensity, 0.15), 1);
      const isCongested = (d.deltaPct || 0) >= 15;
      const alpha = Math.round(40 + intensity * 160);
      if (isCongested) {
        return [255, 183, 3, alpha] as RgbaColor;
      }
      return [0, 209, 255, alpha] as RgbaColor;
    },
    radiusMinPixels: 4,
    radiusMaxPixels: 12,
    pickable: true,
  });
}

export function createAisDisruptionsScatterLayer(
  disruptions: AisDisruptionEvent[],
): ScatterplotLayer<AisDisruptionEvent> {
  return new ScatterplotLayer({
    id: 'ais-disruptions-layer',
    data: disruptions,
    getPosition: (d) => [d.lon, d.lat],
    getRadius: 12000,
    getFillColor: (d) => {
      if (d.severity === 'high') {
        return [255, 50, 50, 220] as RgbaColor;
      }
      if (d.severity === 'elevated' || d.type === 'chokepoint_congestion') {
        return [255, 150, 0, 200] as RgbaColor;
      }
      return [255, 200, 100, 180] as RgbaColor;
    },
    radiusMinPixels: 6,
    radiusMaxPixels: 14,
    pickable: true,
    stroked: true,
    getLineColor: [255, 255, 255, 150] as RgbaColor,
    lineWidthMinPixels: 1,
  });
}

export function createCableAdvisoriesScatterLayer(
  cableAdvisories: CableAdvisory[],
): ScatterplotLayer<CableAdvisory> {
  return new ScatterplotLayer({
    id: 'cable-advisories-layer',
    data: cableAdvisories,
    getPosition: (d) => [d.lon, d.lat],
    getRadius: 10000,
    getFillColor: (d) => {
      if (d.severity === 'fault') {
        return [255, 50, 50, 220] as RgbaColor;
      }
      return [255, 200, 0, 200] as RgbaColor;
    },
    radiusMinPixels: 5,
    radiusMaxPixels: 12,
    pickable: true,
    stroked: true,
    getLineColor: [0, 200, 255, 200] as RgbaColor,
    lineWidthMinPixels: 2,
  });
}

export function createRepairShipsScatterLayer(repairShips: RepairShip[]): ScatterplotLayer<RepairShip> {
  return new ScatterplotLayer({
    id: 'repair-ships-layer',
    data: repairShips,
    getPosition: (d) => [d.lon, d.lat],
    getRadius: 8000,
    getFillColor: [0, 255, 200, 200] as RgbaColor,
    radiusMinPixels: 4,
    radiusMaxPixels: 10,
    pickable: true,
  });
}

export function createMilitaryVesselsScatterLayer(
  militaryVessels: MilitaryVessel[],
  color: RgbaColor,
): ScatterplotLayer<MilitaryVessel> {
  return new ScatterplotLayer({
    id: 'military-vessels-layer',
    data: militaryVessels,
    getPosition: (d) => [d.lon, d.lat],
    getRadius: 6000,
    getFillColor: color,
    radiusMinPixels: 4,
    radiusMaxPixels: 10,
    pickable: true,
  });
}

export function createMilitaryVesselClustersScatterLayer(
  vesselClusters: MilitaryVesselCluster[],
): ScatterplotLayer<MilitaryVesselCluster> {
  return new ScatterplotLayer({
    id: 'military-vessel-clusters-layer',
    data: vesselClusters,
    getPosition: (d) => [d.lon, d.lat],
    getRadius: (d) => 15000 + (d.vesselCount || 1) * 3000,
    getFillColor: (d) => {
      const activity = d.activityType || 'unknown';
      if (activity === 'exercise' || activity === 'deployment') return [255, 100, 100, 200] as RgbaColor;
      if (activity === 'transit') return [255, 180, 100, 180] as RgbaColor;
      return [200, 150, 150, 160] as RgbaColor;
    },
    radiusMinPixels: 8,
    radiusMaxPixels: 25,
    pickable: true,
  });
}

export function createMilitaryFlightsScatterLayer(
  militaryFlights: MilitaryFlight[],
  color: RgbaColor,
): ScatterplotLayer<MilitaryFlight> {
  return new ScatterplotLayer({
    id: 'military-flights-layer',
    data: militaryFlights,
    getPosition: (d) => [d.lon, d.lat],
    getRadius: 8000,
    getFillColor: color,
    radiusMinPixels: 4,
    radiusMaxPixels: 12,
    pickable: true,
  });
}

export function createMilitaryFlightClustersScatterLayer(
  flightClusters: MilitaryFlightCluster[],
): ScatterplotLayer<MilitaryFlightCluster> {
  return new ScatterplotLayer({
    id: 'military-flight-clusters-layer',
    data: flightClusters,
    getPosition: (d) => [d.lon, d.lat],
    getRadius: (d) => 15000 + (d.flightCount || 1) * 3000,
    getFillColor: (d) => {
      const activity = d.activityType || 'unknown';
      if (activity === 'exercise' || activity === 'patrol') return [100, 150, 255, 200] as RgbaColor;
      if (activity === 'transport') return [255, 200, 100, 180] as RgbaColor;
      return [150, 150, 200, 160] as RgbaColor;
    },
    radiusMinPixels: 8,
    radiusMaxPixels: 25,
    pickable: true,
  });
}
