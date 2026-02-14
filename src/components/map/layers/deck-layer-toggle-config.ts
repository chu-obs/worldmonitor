import type { MapLayers } from '@/types';

export interface DeckLayerToggleConfigItem {
  key: keyof MapLayers;
  label: string;
  icon: string;
}

export function getDeckLayerToggleConfig(siteVariant: string): DeckLayerToggleConfigItem[] {
  if (siteVariant === 'tech') {
    return [
      { key: 'startupHubs', label: 'Startup Hubs', icon: '&#128640;' },
      { key: 'techHQs', label: 'Tech HQs', icon: '&#127970;' },
      { key: 'accelerators', label: 'Accelerators', icon: '&#9889;' },
      { key: 'cloudRegions', label: 'Cloud Regions', icon: '&#9729;' },
      { key: 'datacenters', label: 'AI Data Centers', icon: '&#128421;' },
      { key: 'cables', label: 'Undersea Cables', icon: '&#128268;' },
      { key: 'outages', label: 'Internet Outages', icon: '&#128225;' },
      { key: 'techEvents', label: 'Tech Events', icon: '&#128197;' },
      { key: 'natural', label: 'Natural Events', icon: '&#127755;' },
      { key: 'fires', label: 'Fires', icon: '&#128293;' },
    ];
  }

  return [
    { key: 'hotspots', label: 'Intel Hotspots', icon: '&#127919;' },
    { key: 'conflicts', label: 'Conflict Zones', icon: '&#9876;' },
    { key: 'bases', label: 'Military Bases', icon: '&#127963;' },
    { key: 'nuclear', label: 'Nuclear Sites', icon: '&#9762;' },
    { key: 'irradiators', label: 'Gamma Irradiators', icon: '&#9888;' },
    { key: 'spaceports', label: 'Spaceports', icon: '&#128640;' },
    { key: 'cables', label: 'Undersea Cables', icon: '&#128268;' },
    { key: 'pipelines', label: 'Pipelines', icon: '&#128738;' },
    { key: 'datacenters', label: 'AI Data Centers', icon: '&#128421;' },
    { key: 'military', label: 'Military Activity', icon: '&#9992;' },
    { key: 'ais', label: 'Ship Traffic', icon: '&#128674;' },
    { key: 'flights', label: 'Flight Delays', icon: '&#9992;' },
    { key: 'protests', label: 'Protests', icon: '&#128226;' },
    { key: 'ucdpEvents', label: 'UCDP Events', icon: '&#9876;' },
    { key: 'displacement', label: 'Displacement Flows', icon: '&#128101;' },
    { key: 'climate', label: 'Climate Anomalies', icon: '&#127787;' },
    { key: 'weather', label: 'Weather Alerts', icon: '&#9928;' },
    { key: 'outages', label: 'Internet Outages', icon: '&#128225;' },
    { key: 'natural', label: 'Natural Events', icon: '&#127755;' },
    { key: 'fires', label: 'Fires', icon: '&#128293;' },
    { key: 'waterways', label: 'Strategic Waterways', icon: '&#9875;' },
    { key: 'economic', label: 'Economic Centers', icon: '&#128176;' },
    { key: 'minerals', label: 'Critical Minerals', icon: '&#128142;' },
  ];
}
