import { ScatterplotLayer } from '@deck.gl/layers';
import {
  STRATEGIC_WATERWAYS,
  ECONOMIC_CENTERS,
  APT_GROUPS,
  CRITICAL_MINERALS,
  STARTUP_HUBS,
  ACCELERATORS,
  CLOUD_REGIONS,
  PORTS,
  SPACEPORTS,
  GAMMA_IRRADIATORS,
} from '@/config';

export type RgbaColor = [number, number, number, number];

export function createIrradiatorsScatterLayer(): ScatterplotLayer {
  return new ScatterplotLayer({
    id: 'irradiators-layer',
    data: GAMMA_IRRADIATORS,
    getPosition: (d) => [d.lon, d.lat],
    getRadius: 6000,
    getFillColor: [255, 100, 255, 180] as RgbaColor,
    radiusMinPixels: 4,
    radiusMaxPixels: 10,
    pickable: true,
  });
}

export function createSpaceportsScatterLayer(): ScatterplotLayer {
  return new ScatterplotLayer({
    id: 'spaceports-layer',
    data: SPACEPORTS,
    getPosition: (d) => [d.lon, d.lat],
    getRadius: 10000,
    getFillColor: [200, 100, 255, 200] as RgbaColor,
    radiusMinPixels: 5,
    radiusMaxPixels: 12,
    pickable: true,
  });
}

export function createPortsScatterLayer(): ScatterplotLayer {
  return new ScatterplotLayer({
    id: 'ports-layer',
    data: PORTS,
    getPosition: (d) => [d.lon, d.lat],
    getRadius: 6000,
    getFillColor: (d) => {
      switch (d.type) {
        case 'naval':
          return [100, 150, 255, 200] as RgbaColor;
        case 'oil':
          return [255, 140, 0, 200] as RgbaColor;
        case 'lng':
          return [255, 200, 50, 200] as RgbaColor;
        case 'container':
          return [0, 200, 255, 180] as RgbaColor;
        case 'mixed':
          return [150, 200, 150, 180] as RgbaColor;
        case 'bulk':
          return [180, 150, 120, 180] as RgbaColor;
        default:
          return [0, 200, 255, 160] as RgbaColor;
      }
    },
    radiusMinPixels: 4,
    radiusMaxPixels: 10,
    pickable: true,
  });
}

export function createWaterwaysScatterLayer(): ScatterplotLayer {
  return new ScatterplotLayer({
    id: 'waterways-layer',
    data: STRATEGIC_WATERWAYS,
    getPosition: (d) => [d.lon, d.lat],
    getRadius: 10000,
    getFillColor: [100, 150, 255, 180] as RgbaColor,
    radiusMinPixels: 5,
    radiusMaxPixels: 12,
    pickable: true,
  });
}

export function createEconomicCentersScatterLayer(): ScatterplotLayer {
  return new ScatterplotLayer({
    id: 'economic-centers-layer',
    data: ECONOMIC_CENTERS,
    getPosition: (d) => [d.lon, d.lat],
    getRadius: 8000,
    getFillColor: [255, 215, 0, 180] as RgbaColor,
    radiusMinPixels: 4,
    radiusMaxPixels: 10,
    pickable: true,
  });
}

export function createAptGroupsScatterLayer(): ScatterplotLayer {
  return new ScatterplotLayer({
    id: 'apt-groups-layer',
    data: APT_GROUPS,
    getPosition: (d) => [d.lon, d.lat],
    getRadius: 6000,
    getFillColor: [255, 140, 0, 140] as RgbaColor,
    radiusMinPixels: 4,
    radiusMaxPixels: 8,
    pickable: true,
    stroked: false,
  });
}

export function createMineralsScatterLayer(): ScatterplotLayer {
  return new ScatterplotLayer({
    id: 'minerals-layer',
    data: CRITICAL_MINERALS,
    getPosition: (d) => [d.lon, d.lat],
    getRadius: 8000,
    getFillColor: (d) => {
      switch (d.mineral) {
        case 'Lithium':
          return [0, 200, 255, 200] as RgbaColor;
        case 'Cobalt':
          return [100, 100, 255, 200] as RgbaColor;
        case 'Rare Earths':
          return [255, 100, 200, 200] as RgbaColor;
        case 'Nickel':
          return [100, 255, 100, 200] as RgbaColor;
        default:
          return [200, 200, 200, 200] as RgbaColor;
      }
    },
    radiusMinPixels: 5,
    radiusMaxPixels: 12,
    pickable: true,
  });
}

export function createStartupHubsScatterLayer(color: RgbaColor): ScatterplotLayer {
  return new ScatterplotLayer({
    id: 'startup-hubs-layer',
    data: STARTUP_HUBS,
    getPosition: (d) => [d.lon, d.lat],
    getRadius: 10000,
    getFillColor: color,
    radiusMinPixels: 5,
    radiusMaxPixels: 12,
    pickable: true,
  });
}

export function createAcceleratorsScatterLayer(color: RgbaColor): ScatterplotLayer {
  return new ScatterplotLayer({
    id: 'accelerators-layer',
    data: ACCELERATORS,
    getPosition: (d) => [d.lon, d.lat],
    getRadius: 6000,
    getFillColor: color,
    radiusMinPixels: 3,
    radiusMaxPixels: 8,
    pickable: true,
  });
}

export function createCloudRegionsScatterLayer(color: RgbaColor): ScatterplotLayer {
  return new ScatterplotLayer({
    id: 'cloud-regions-layer',
    data: CLOUD_REGIONS,
    getPosition: (d) => [d.lon, d.lat],
    getRadius: 12000,
    getFillColor: color,
    radiusMinPixels: 4,
    radiusMaxPixels: 12,
    pickable: true,
  });
}
