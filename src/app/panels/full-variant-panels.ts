import {
  CIIPanel,
  CascadePanel,
  ClimateAnomalyPanel,
  DisplacementPanel,
  GdeltIntelPanel,
  type Panel,
  PopulationExposurePanel,
  StrategicPosturePanel,
  StrategicRiskPanel,
  UcdpEventsPanel,
} from '@/components';
import { SatelliteFiresPanel } from '@/components/SatelliteFiresPanel';

interface RegisterFullVariantPanelsOptions {
  panels: Record<string, Panel>;
  onShareStory: (countryCode: string, countryName: string) => void;
  onCenterMap: (lat: number, lon: number, zoom: number) => void;
}

export function registerFullVariantPanels(options: RegisterFullVariantPanelsOptions): void {
  options.panels['gdelt-intel'] = new GdeltIntelPanel();

  const ciiPanel = new CIIPanel();
  ciiPanel.setShareStoryHandler((code, name) => {
    options.onShareStory(code, name);
  });
  options.panels['cii'] = ciiPanel;

  options.panels['cascade'] = new CascadePanel();
  options.panels['satellite-fires'] = new SatelliteFiresPanel();

  const strategicRiskPanel = new StrategicRiskPanel();
  strategicRiskPanel.setLocationClickHandler((lat, lon) => {
    options.onCenterMap(lat, lon, 4);
  });
  options.panels['strategic-risk'] = strategicRiskPanel;

  const strategicPosturePanel = new StrategicPosturePanel();
  strategicPosturePanel.setLocationClickHandler((lat, lon) => {
    options.onCenterMap(lat, lon, 4);
  });
  options.panels['strategic-posture'] = strategicPosturePanel;

  const ucdpEventsPanel = new UcdpEventsPanel();
  ucdpEventsPanel.setEventClickHandler((lat, lon) => {
    options.onCenterMap(lat, lon, 5);
  });
  options.panels['ucdp-events'] = ucdpEventsPanel;

  const displacementPanel = new DisplacementPanel();
  displacementPanel.setCountryClickHandler((lat, lon) => {
    options.onCenterMap(lat, lon, 4);
  });
  options.panels['displacement'] = displacementPanel;

  const climatePanel = new ClimateAnomalyPanel();
  climatePanel.setZoneClickHandler((lat, lon) => {
    options.onCenterMap(lat, lon, 4);
  });
  options.panels['climate'] = climatePanel;

  options.panels['population-exposure'] = new PopulationExposurePanel();
}
