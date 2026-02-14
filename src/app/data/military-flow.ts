import type { IntelligenceCache } from '@/app/state/country-signals';
import type {
  CIIPanel,
  InsightsPanel,
  MapContainer,
  SignalModal,
  StatusPanel,
  StrategicPosturePanel,
} from '@/components';
import {
  addToSignalHistory,
  fetchMilitaryFlights,
  fetchMilitaryVessels,
  initMilitaryVesselStream,
  isMilitaryVesselTrackingConfigured,
} from '@/services';
import { ingestFlights, ingestVessels } from '@/services/geo-convergence';
import {
  detectForeignMilitaryPresence,
  foreignPresenceToSignal,
  type TheaterPostureSummary,
  analyzeFlightsForSurge,
  surgeAlertToSignal,
} from '@/services/military-surge';
import { signalAggregator } from '@/services/signal-aggregator';
import { updateAndCheck } from '@/services/temporal-baseline';
import { fetchCachedTheaterPosture } from '@/services/cached-theater-posture';
import { dataFreshness } from '@/services/data-freshness';
import { ingestMilitaryForCII, isInLearningMode } from '@/services/country-instability';
import type {
  MilitaryFlight,
  MilitaryFlightCluster,
  MilitaryVessel,
  MilitaryVesselCluster,
} from '@/types';

interface LoadCachedPosturesForBannerFlowOptions {
  renderCriticalBanner: (postures: TheaterPostureSummary[]) => void;
  posturePanel: StrategicPosturePanel | null;
}

interface LoadMilitaryFlowOptions {
  intelligenceCache: IntelligenceCache;
  map: MapContainer | null;
  ciiPanel: CIIPanel | null;
  insightsPanel: InsightsPanel | null;
  statusPanel: StatusPanel | null;
  signalModal: SignalModal | null;
  renderCriticalBanner: (postures: TheaterPostureSummary[]) => void;
  posturePanel: StrategicPosturePanel | null;
}

function renderMilitaryState(options: {
  map: MapContainer | null;
  insightsPanel: InsightsPanel | null;
  statusPanel: StatusPanel | null;
  flights: MilitaryFlight[];
  flightClusters: MilitaryFlightCluster[];
  vessels: MilitaryVessel[];
  vesselClusters: MilitaryVesselCluster[];
}): void {
  options.map?.setMilitaryFlights(options.flights, options.flightClusters);
  options.map?.setMilitaryVessels(options.vessels, options.vesselClusters);
  options.map?.updateMilitaryForEscalation(options.flights, options.vessels);
  options.insightsPanel?.setMilitaryFlights(options.flights);

  const hasData = options.flights.length > 0 || options.vessels.length > 0;
  options.map?.setLayerReady('military', hasData);

  const militaryCount = options.flights.length + options.vessels.length;
  options.statusPanel?.updateFeed('Military', {
    status: militaryCount > 0 ? 'ok' : 'warning',
    itemCount: militaryCount,
    errorMessage: militaryCount === 0 ? 'No military activity in view' : undefined,
  });
}

/**
 * Load cached theater posture data used by both the critical banner and posture panel.
 */
export async function loadCachedPosturesForBannerFlow(
  options: LoadCachedPosturesForBannerFlowOptions
): Promise<void> {
  try {
    const data = await fetchCachedTheaterPosture();
    if (data && data.postures.length > 0) {
      options.renderCriticalBanner(data.postures);
      options.posturePanel?.updatePostures(data);
    }
  } catch (error) {
    console.warn('[App] Failed to load cached postures for banner:', error);
  }
}

/**
 * Load military layer data from cache or live services and apply all side effects.
 */
export async function loadMilitaryFlow(options: LoadMilitaryFlowOptions): Promise<void> {
  if (options.intelligenceCache.military) {
    const { flights, flightClusters, vessels, vesselClusters } = options.intelligenceCache.military;
    renderMilitaryState({
      map: options.map,
      insightsPanel: options.insightsPanel,
      statusPanel: options.statusPanel,
      flights,
      flightClusters,
      vessels,
      vesselClusters,
    });
    void loadCachedPosturesForBannerFlow({
      renderCriticalBanner: options.renderCriticalBanner,
      posturePanel: options.posturePanel,
    });
    options.statusPanel?.updateApi('OpenSky', { status: 'ok' });
    return;
  }

  try {
    if (isMilitaryVesselTrackingConfigured()) {
      initMilitaryVesselStream();
    }

    const [flightData, vesselData] = await Promise.all([
      fetchMilitaryFlights(),
      fetchMilitaryVessels(),
    ]);

    options.intelligenceCache.military = {
      flights: flightData.flights,
      flightClusters: flightData.clusters,
      vessels: vesselData.vessels,
      vesselClusters: vesselData.clusters,
    };

    ingestFlights(flightData.flights);
    ingestVessels(vesselData.vessels);
    ingestMilitaryForCII(flightData.flights, vesselData.vessels);
    signalAggregator.ingestFlights(flightData.flights);
    signalAggregator.ingestVessels(vesselData.vessels);

    updateAndCheck([
      { type: 'military_flights', region: 'global', count: flightData.flights.length },
      { type: 'vessels', region: 'global', count: vesselData.vessels.length },
    ]).then((anomalies) => {
      if (anomalies.length > 0) signalAggregator.ingestTemporalAnomalies(anomalies);
    }).catch(() => {});

    options.ciiPanel?.refresh();

    if (!isInLearningMode()) {
      const surgeAlerts = analyzeFlightsForSurge(flightData.flights);
      if (surgeAlerts.length > 0) {
        const surgeSignals = surgeAlerts.map(surgeAlertToSignal);
        addToSignalHistory(surgeSignals);
        options.signalModal?.show(surgeSignals);
      }

      const foreignAlerts = detectForeignMilitaryPresence(flightData.flights);
      if (foreignAlerts.length > 0) {
        const foreignSignals = foreignAlerts.map(foreignPresenceToSignal);
        addToSignalHistory(foreignSignals);
        options.signalModal?.show(foreignSignals);
      }
    }

    renderMilitaryState({
      map: options.map,
      insightsPanel: options.insightsPanel,
      statusPanel: options.statusPanel,
      flights: flightData.flights,
      flightClusters: flightData.clusters,
      vessels: vesselData.vessels,
      vesselClusters: vesselData.clusters,
    });
    void loadCachedPosturesForBannerFlow({
      renderCriticalBanner: options.renderCriticalBanner,
      posturePanel: options.posturePanel,
    });
    options.statusPanel?.updateApi('OpenSky', { status: 'ok' });
    dataFreshness.recordUpdate('opensky', flightData.flights.length);
  } catch (error) {
    options.map?.setLayerReady('military', false);
    options.statusPanel?.updateFeed('Military', { status: 'error', errorMessage: String(error) });
    options.statusPanel?.updateApi('OpenSky', { status: 'error' });
    dataFreshness.recordError('opensky', String(error));
  }
}
