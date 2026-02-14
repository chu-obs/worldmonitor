import { IconLayer } from '@deck.gl/layers';
import { MILITARY_BASES, NUCLEAR_FACILITIES, AI_DATA_CENTERS } from '@/config';

export type RgbaColor = [number, number, number, number];

export function createBasesIconLayer(
  highlightedBaseIds: Set<string>,
  zoom: number,
  triangleIconUrl: string,
): IconLayer {
  const alphaScale = Math.min(1, (zoom - 2.5) / 2.5);
  const alpha = Math.round(160 * Math.max(0.3, alphaScale));

  const getBaseColor = (type: string): RgbaColor => {
    switch (type) {
      case 'us-nato':
        return [68, 136, 255, alpha];
      case 'russia':
        return [255, 68, 68, alpha];
      case 'china':
        return [255, 136, 68, alpha];
      case 'uk':
        return [68, 170, 255, alpha];
      case 'france':
        return [0, 85, 164, alpha];
      case 'india':
        return [255, 153, 51, alpha];
      case 'japan':
        return [188, 0, 45, alpha];
      default:
        return [136, 136, 136, alpha];
    }
  };

  return new IconLayer({
    id: 'bases-layer',
    data: MILITARY_BASES,
    getPosition: (d) => [d.lon, d.lat],
    getIcon: () => 'triangleUp',
    iconAtlas: triangleIconUrl,
    iconMapping: { triangleUp: { x: 0, y: 0, width: 32, height: 32, mask: true } },
    getSize: (d) => (highlightedBaseIds.has(d.id) ? 16 : 11),
    getColor: (d) => {
      if (highlightedBaseIds.has(d.id)) {
        return [255, 100, 100, 220] as RgbaColor;
      }
      return getBaseColor(d.type);
    },
    sizeScale: 1,
    sizeMinPixels: 6,
    sizeMaxPixels: 16,
    pickable: true,
  });
}

export function createNuclearIconLayer(
  highlightedNuclearIds: Set<string>,
  hexagonIconUrl: string,
): IconLayer {
  const data = NUCLEAR_FACILITIES.filter((f) => f.status !== 'decommissioned');

  return new IconLayer({
    id: 'nuclear-layer',
    data,
    getPosition: (d) => [d.lon, d.lat],
    getIcon: () => 'hexagon',
    iconAtlas: hexagonIconUrl,
    iconMapping: { hexagon: { x: 0, y: 0, width: 32, height: 32, mask: true } },
    getSize: (d) => (highlightedNuclearIds.has(d.id) ? 15 : 11),
    getColor: (d) => {
      if (highlightedNuclearIds.has(d.id)) {
        return [255, 100, 100, 220] as RgbaColor;
      }
      if (d.status === 'contested') {
        return [255, 50, 50, 200] as RgbaColor;
      }
      return [255, 220, 0, 200] as RgbaColor;
    },
    sizeScale: 1,
    sizeMinPixels: 6,
    sizeMaxPixels: 15,
    pickable: true,
  });
}

export function createDatacentersIconLayer(
  highlightedDatacenterIds: Set<string>,
  squareIconUrl: string,
): IconLayer {
  const data = AI_DATA_CENTERS.filter((dc) => dc.status !== 'decommissioned');

  return new IconLayer({
    id: 'datacenters-layer',
    data,
    getPosition: (d) => [d.lon, d.lat],
    getIcon: () => 'square',
    iconAtlas: squareIconUrl,
    iconMapping: { square: { x: 0, y: 0, width: 32, height: 32, mask: true } },
    getSize: (d) => (highlightedDatacenterIds.has(d.id) ? 14 : 10),
    getColor: (d) => {
      if (highlightedDatacenterIds.has(d.id)) {
        return [255, 100, 100, 200] as RgbaColor;
      }
      if (d.status === 'planned') {
        return [136, 68, 255, 100] as RgbaColor;
      }
      return [136, 68, 255, 140] as RgbaColor;
    },
    sizeScale: 1,
    sizeMinPixels: 6,
    sizeMaxPixels: 14,
    pickable: true,
  });
}
