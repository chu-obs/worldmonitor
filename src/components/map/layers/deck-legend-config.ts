export type DeckLegendShape = 'circle' | 'triangle' | 'square' | 'hexagon';

export interface DeckLegendItemConfig {
  shape: DeckLegendShape;
  color: string;
  label: string;
}

export function getDeckLegendConfig(siteVariant: string): DeckLegendItemConfig[] {
  if (siteVariant === 'tech') {
    return [
      { shape: 'circle', color: 'rgb(0, 255, 150)', label: 'Startup Hub' },
      { shape: 'circle', color: 'rgb(100, 200, 255)', label: 'Tech HQ' },
      { shape: 'circle', color: 'rgb(255, 200, 0)', label: 'Accelerator' },
      { shape: 'circle', color: 'rgb(150, 100, 255)', label: 'Cloud Region' },
      { shape: 'square', color: 'rgb(136, 68, 255)', label: 'Datacenter' },
    ];
  }

  return [
    { shape: 'circle', color: 'rgb(255, 68, 68)', label: 'High Alert' },
    { shape: 'circle', color: 'rgb(255, 165, 0)', label: 'Elevated' },
    { shape: 'circle', color: 'rgb(255, 255, 0)', label: 'Monitoring' },
    { shape: 'triangle', color: 'rgb(68, 136, 255)', label: 'Base' },
    { shape: 'hexagon', color: 'rgb(255, 220, 0)', label: 'Nuclear' },
    { shape: 'square', color: 'rgb(136, 68, 255)', label: 'Datacenter' },
  ];
}
