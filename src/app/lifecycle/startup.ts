import type { MapLayers } from '@/types';
import { IntelligenceGapBadge, SignalModal } from '@/components';

interface InitializeStartupPrerequisitesFlowOptions {
  mapLayers: MapLayers;
  initDatabase: () => Promise<unknown>;
  initMlWorker: () => Promise<unknown>;
  isAisConfigured: () => boolean;
  initAisStream: () => void;
}

interface SetupSignalModalFlowOptions {
  onCenterMap: (lat: number, lon: number, zoom: number) => void;
  isCountryIntelVisible: () => boolean;
  setSignalModal: (modal: SignalModal) => void;
}

interface FinalizeInitializationFlowOptions {
  startLearning: () => void;
  isAisConfigured: () => boolean;
  isOutagesConfigured: () => boolean | null;
  hideLayerToggle: (layer: 'ais' | 'outages') => void;
  setupRefreshIntervals: () => void;
  setupSnapshotSaving: () => void;
  cleanOldSnapshots: () => void;
  handleDeepLinks: () => void;
}

export async function initializeStartupPrerequisitesFlow(
  options: InitializeStartupPrerequisitesFlowOptions
): Promise<void> {
  await options.initDatabase();
  await options.initMlWorker();

  if (!options.isAisConfigured()) {
    options.mapLayers.ais = false;
  } else if (options.mapLayers.ais) {
    options.initAisStream();
  }
}

export function setupSignalModalFlow(options: SetupSignalModalFlowOptions): void {
  const signalModal = new SignalModal();
  signalModal.setLocationClickHandler((lat, lon) => {
    options.onCenterMap(lat, lon, 4);
  });

  const findingsBadge = new IntelligenceGapBadge();
  findingsBadge.setOnSignalClick((signal) => {
    if (options.isCountryIntelVisible()) return;
    signalModal.showSignal(signal);
  });
  findingsBadge.setOnAlertClick((alert) => {
    if (options.isCountryIntelVisible()) return;
    signalModal.showAlert(alert);
  });

  options.setSignalModal(signalModal);
}

export function finalizeInitializationFlow(options: FinalizeInitializationFlowOptions): void {
  options.startLearning();

  if (!options.isAisConfigured()) {
    options.hideLayerToggle('ais');
  }
  if (options.isOutagesConfigured() === false) {
    options.hideLayerToggle('outages');
  }

  options.setupRefreshIntervals();
  options.setupSnapshotSaving();
  options.cleanOldSnapshots();
  options.handleDeepLinks();
}
