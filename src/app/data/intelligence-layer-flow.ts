import type { IntelligenceCache } from '@/app/state/country-signals';
import type { CIIPanel, MapContainer, StatusPanel } from '@/components';
import {
  fetchAisSignals,
  fetchCableActivity,
  fetchFlightDelays,
  fetchInternetOutages,
  fetchProtestEvents,
  getAisStatus,
  getProtestStatus,
} from '@/services';
import { ingestProtests } from '@/services/geo-convergence';
import { signalAggregator } from '@/services/signal-aggregator';
import { updateAndCheck } from '@/services/temporal-baseline';
import { ingestOutagesForCII, ingestProtestsForCII } from '@/services/country-instability';
import { dataFreshness } from '@/services/data-freshness';

interface LoadOutagesLayerFlowOptions {
  intelligenceCache: IntelligenceCache;
  map: MapContainer | null;
  statusPanel: StatusPanel | null;
}

interface LoadAisSignalsFlowOptions {
  map: MapContainer | null;
  statusPanel: StatusPanel | null;
}

interface WaitForAisDataFlowOptions {
  map: MapContainer | null;
  statusPanel: StatusPanel | null;
  loadAisSignals: () => Promise<void> | void;
}

interface LoadCableActivityFlowOptions {
  map: MapContainer | null;
  statusPanel: StatusPanel | null;
}

interface LoadProtestsLayerFlowOptions {
  intelligenceCache: IntelligenceCache;
  map: MapContainer | null;
  statusPanel: StatusPanel | null;
  ciiPanel: CIIPanel | null;
}

interface LoadFlightDelaysFlowOptions {
  map: MapContainer | null;
  statusPanel: StatusPanel | null;
}

function getProtestErrorMessageAndUpdateApis(statusPanel: StatusPanel | null): string | undefined {
  const status = getProtestStatus();
  if (status.acledConfigured === true) {
    statusPanel?.updateApi('ACLED', { status: 'ok' });
  } else if (status.acledConfigured === null) {
    statusPanel?.updateApi('ACLED', { status: 'warning' });
  }
  statusPanel?.updateApi('GDELT', { status: 'ok' });
  return status.acledConfigured === false ? 'ACLED not configured - using GDELT only' : undefined;
}

export async function loadOutagesLayerFlow(options: LoadOutagesLayerFlowOptions): Promise<void> {
  if (options.intelligenceCache.outages) {
    const outages = options.intelligenceCache.outages;
    options.map?.setOutages(outages);
    options.map?.setLayerReady('outages', outages.length > 0);
    options.statusPanel?.updateFeed('NetBlocks', { status: 'ok', itemCount: outages.length });
    return;
  }

  try {
    const outages = await fetchInternetOutages();
    options.intelligenceCache.outages = outages;
    options.map?.setOutages(outages);
    options.map?.setLayerReady('outages', outages.length > 0);
    ingestOutagesForCII(outages);
    signalAggregator.ingestOutages(outages);
    options.statusPanel?.updateFeed('NetBlocks', { status: 'ok', itemCount: outages.length });
    dataFreshness.recordUpdate('outages', outages.length);
  } catch (error) {
    options.map?.setLayerReady('outages', false);
    options.statusPanel?.updateFeed('NetBlocks', { status: 'error' });
    dataFreshness.recordError('outages', String(error));
  }
}

export async function loadAisSignalsLayerFlow(options: LoadAisSignalsFlowOptions): Promise<void> {
  try {
    const { disruptions, density } = await fetchAisSignals();
    const aisStatus = getAisStatus();
    console.log('[Ships] Events:', {
      disruptions: disruptions.length,
      density: density.length,
      vessels: aisStatus.vessels,
    });
    options.map?.setAisData(disruptions, density);
    signalAggregator.ingestAisDisruptions(disruptions);

    updateAndCheck([
      { type: 'ais_gaps', region: 'global', count: disruptions.length },
    ]).then((anomalies) => {
      if (anomalies.length > 0) signalAggregator.ingestTemporalAnomalies(anomalies);
    }).catch(() => {});

    const hasData = disruptions.length > 0 || density.length > 0;
    options.map?.setLayerReady('ais', hasData);

    const shippingCount = disruptions.length + density.length;
    const shippingStatus = shippingCount > 0 ? 'ok' : (aisStatus.connected ? 'warning' : 'error');
    options.statusPanel?.updateFeed('Shipping', {
      status: shippingStatus,
      itemCount: shippingCount,
      errorMessage: !aisStatus.connected && shippingCount === 0 ? 'AIS snapshot unavailable' : undefined,
    });
    options.statusPanel?.updateApi('AISStream', {
      status: aisStatus.connected ? 'ok' : 'warning',
    });
    if (hasData) {
      dataFreshness.recordUpdate('ais', shippingCount);
    }
  } catch (error) {
    options.map?.setLayerReady('ais', false);
    options.statusPanel?.updateFeed('Shipping', { status: 'error', errorMessage: String(error) });
    options.statusPanel?.updateApi('AISStream', { status: 'error' });
    dataFreshness.recordError('ais', String(error));
  }
}

export function waitForAisDataFlow(options: WaitForAisDataFlowOptions): void {
  const maxAttempts = 30;
  let attempts = 0;

  const checkData = () => {
    attempts += 1;
    const status = getAisStatus();

    if (status.vessels > 0 || status.connected) {
      void options.loadAisSignals();
      options.map?.setLayerLoading('ais', false);
      return;
    }

    if (attempts >= maxAttempts) {
      options.map?.setLayerLoading('ais', false);
      options.map?.setLayerReady('ais', false);
      options.statusPanel?.updateFeed('Shipping', {
        status: 'error',
        errorMessage: 'Connection timeout',
      });
      return;
    }

    setTimeout(checkData, 1000);
  };

  checkData();
}

export async function loadCableActivityLayerFlow(
  options: LoadCableActivityFlowOptions
): Promise<void> {
  try {
    const activity = await fetchCableActivity();
    options.map?.setCableActivity(activity.advisories, activity.repairShips);
    const itemCount = activity.advisories.length + activity.repairShips.length;
    options.statusPanel?.updateFeed('CableOps', { status: 'ok', itemCount });
  } catch {
    options.statusPanel?.updateFeed('CableOps', { status: 'error' });
  }
}

export async function loadProtestsLayerFlow(options: LoadProtestsLayerFlowOptions): Promise<void> {
  if (options.intelligenceCache.protests) {
    const protestData = options.intelligenceCache.protests;
    options.map?.setProtests(protestData.events);
    options.map?.setLayerReady('protests', protestData.events.length > 0);
    const errorMessage = getProtestErrorMessageAndUpdateApis(options.statusPanel);
    options.statusPanel?.updateFeed('Protests', {
      status: 'ok',
      itemCount: protestData.events.length,
      errorMessage,
    });
    return;
  }

  try {
    const protestData = await fetchProtestEvents();
    options.intelligenceCache.protests = protestData;
    options.map?.setProtests(protestData.events);
    options.map?.setLayerReady('protests', protestData.events.length > 0);
    ingestProtests(protestData.events);
    ingestProtestsForCII(protestData.events);
    signalAggregator.ingestProtests(protestData.events);

    const protestCount = protestData.sources.acled + protestData.sources.gdelt;
    if (protestCount > 0) dataFreshness.recordUpdate('acled', protestCount);
    if (protestData.sources.gdelt > 0) dataFreshness.recordUpdate('gdelt', protestData.sources.gdelt);

    options.ciiPanel?.refresh();
    const errorMessage = getProtestErrorMessageAndUpdateApis(options.statusPanel);
    options.statusPanel?.updateFeed('Protests', {
      status: 'ok',
      itemCount: protestData.events.length,
      errorMessage,
    });
  } catch (error) {
    options.map?.setLayerReady('protests', false);
    options.statusPanel?.updateFeed('Protests', { status: 'error', errorMessage: String(error) });
    options.statusPanel?.updateApi('ACLED', { status: 'error' });
    options.statusPanel?.updateApi('GDELT', { status: 'error' });
  }
}

export async function loadFlightDelaysLayerFlow(
  options: LoadFlightDelaysFlowOptions
): Promise<void> {
  try {
    const delays = await fetchFlightDelays();
    options.map?.setFlightDelays(delays);
    options.map?.setLayerReady('flights', delays.length > 0);
    options.statusPanel?.updateFeed('Flights', {
      status: 'ok',
      itemCount: delays.length,
    });
    options.statusPanel?.updateApi('FAA', { status: 'ok' });
  } catch (error) {
    options.map?.setLayerReady('flights', false);
    options.statusPanel?.updateFeed('Flights', { status: 'error', errorMessage: String(error) });
    options.statusPanel?.updateApi('FAA', { status: 'error' });
  }
}
