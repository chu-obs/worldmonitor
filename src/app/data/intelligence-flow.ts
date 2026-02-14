import type { MapLayers, SocialUnrestEvent } from '@/types';
import {
  fetchInternetOutages,
  fetchProtestEvents,
  getProtestStatus,
  fetchMilitaryFlights,
  fetchMilitaryVessels,
  initMilitaryVesselStream,
  isMilitaryVesselTrackingConfigured,
  addToSignalHistory,
} from '@/services';
import { ingestProtests, ingestFlights, ingestVessels } from '@/services/geo-convergence';
import { updateAndCheck } from '@/services/temporal-baseline';
import {
  analyzeFlightsForSurge,
  surgeAlertToSignal,
  detectForeignMilitaryPresence,
  foreignPresenceToSignal,
} from '@/services/military-surge';
import {
  ingestProtestsForCII,
  ingestMilitaryForCII,
  ingestOutagesForCII,
  ingestConflictsForCII,
  ingestUcdpForCII,
  ingestHapiForCII,
  ingestDisplacementForCII,
  ingestClimateForCII,
  isInLearningMode,
} from '@/services/country-instability';
import { dataFreshness } from '@/services/data-freshness';
import { fetchConflictEvents } from '@/services/conflicts';
import { fetchUcdpClassifications } from '@/services/ucdp';
import { fetchHapiSummary } from '@/services/hapi';
import { fetchUcdpEvents, deduplicateAgainstAcled } from '@/services/ucdp-events';
import { fetchUnhcrPopulation } from '@/services/unhcr';
import { fetchClimateAnomalies } from '@/services/climate';
import { enrichEventsWithExposure } from '@/services/population-exposure';
import { signalAggregator } from '@/services/signal-aggregator';
import {
  type MapContainer,
  type Panel,
  type SignalModal,
  type StatusPanel,
  CIIPanel,
  ClimateAnomalyPanel,
  DisplacementPanel,
  PopulationExposurePanel,
  UcdpEventsPanel,
} from '@/components';
import type { IntelligenceCache } from '@/app/state/country-signals';

interface IntelligenceFlowOptions {
  mapLayers: MapLayers;
  intelligenceCache: IntelligenceCache;
  map: MapContainer | null;
  panels: Record<string, Panel>;
  statusPanel: StatusPanel | null;
  signalModal: SignalModal | null;
}

export async function loadIntelligenceSignalsFlow(options: IntelligenceFlowOptions): Promise<void> {
  const tasks: Promise<void>[] = [];

  // Always fetch outages for CII (internet blackouts = major instability signal)
  tasks.push((async () => {
    try {
      const outages = await fetchInternetOutages();
      options.intelligenceCache.outages = outages;
      ingestOutagesForCII(outages);
      signalAggregator.ingestOutages(outages);
      dataFreshness.recordUpdate('outages', outages.length);
      // Update map only if layer is visible
      if (options.mapLayers.outages) {
        options.map?.setOutages(outages);
        options.map?.setLayerReady('outages', outages.length > 0);
        options.statusPanel?.updateFeed('NetBlocks', { status: 'ok', itemCount: outages.length });
      }
    } catch (error) {
      console.error('[Intelligence] Outages fetch failed:', error);
      dataFreshness.recordError('outages', String(error));
    }
  })());

  // Always fetch protests for CII (unrest = core instability metric)
  // This task is also used by UCDP deduplication, so keep it as a shared promise.
  const protestsTask = (async (): Promise<SocialUnrestEvent[]> => {
    try {
      const protestData = await fetchProtestEvents();
      options.intelligenceCache.protests = protestData;
      ingestProtests(protestData.events);
      ingestProtestsForCII(protestData.events);
      signalAggregator.ingestProtests(protestData.events);
      const protestCount = protestData.sources.acled + protestData.sources.gdelt;
      if (protestCount > 0) dataFreshness.recordUpdate('acled', protestCount);
      if (protestData.sources.gdelt > 0) dataFreshness.recordUpdate('gdelt', protestData.sources.gdelt);
      // Update map only if layer is visible
      if (options.mapLayers.protests) {
        options.map?.setProtests(protestData.events);
        options.map?.setLayerReady('protests', protestData.events.length > 0);
        const status = getProtestStatus();
        options.statusPanel?.updateFeed('Protests', {
          status: 'ok',
          itemCount: protestData.events.length,
          errorMessage: status.acledConfigured === false ? 'ACLED not configured - using GDELT only' : undefined,
        });
      }
      return protestData.events;
    } catch (error) {
      console.error('[Intelligence] Protests fetch failed:', error);
      dataFreshness.recordError('acled', String(error));
      return [];
    }
  })();
  tasks.push(protestsTask.then(() => undefined));

  // Fetch armed conflict events (battles, explosions, violence) for CII
  tasks.push((async () => {
    try {
      const conflictData = await fetchConflictEvents();
      ingestConflictsForCII(conflictData.events);
      if (conflictData.count > 0) dataFreshness.recordUpdate('acled_conflict', conflictData.count);
    } catch (error) {
      console.error('[Intelligence] Conflict events fetch failed:', error);
      dataFreshness.recordError('acled_conflict', String(error));
    }
  })());

  // Fetch UCDP conflict classifications (war vs minor vs none)
  tasks.push((async () => {
    try {
      const classifications = await fetchUcdpClassifications();
      ingestUcdpForCII(classifications);
      if (classifications.size > 0) dataFreshness.recordUpdate('ucdp', classifications.size);
    } catch (error) {
      console.error('[Intelligence] UCDP fetch failed:', error);
      dataFreshness.recordError('ucdp', String(error));
    }
  })());

  // Fetch HDX HAPI aggregated conflict data (fallback/validation)
  tasks.push((async () => {
    try {
      const summaries = await fetchHapiSummary();
      ingestHapiForCII(summaries);
      if (summaries.size > 0) dataFreshness.recordUpdate('hapi', summaries.size);
    } catch (error) {
      console.error('[Intelligence] HAPI fetch failed:', error);
      dataFreshness.recordError('hapi', String(error));
    }
  })());

  // Always fetch military for CII (security = core instability metric)
  tasks.push((async () => {
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
      dataFreshness.recordUpdate('opensky', flightData.flights.length);
      // Temporal baseline: report counts and check for anomalies
      updateAndCheck([
        { type: 'military_flights', region: 'global', count: flightData.flights.length },
        { type: 'vessels', region: 'global', count: vesselData.vessels.length },
      ]).then((anomalies) => {
        if (anomalies.length > 0) signalAggregator.ingestTemporalAnomalies(anomalies);
      }).catch(() => {});
      // Update map only if layer is visible
      if (options.mapLayers.military) {
        options.map?.setMilitaryFlights(flightData.flights, flightData.clusters);
        options.map?.setMilitaryVessels(vesselData.vessels, vesselData.clusters);
        options.map?.updateMilitaryForEscalation(flightData.flights, vesselData.vessels);
        const militaryCount = flightData.flights.length + vesselData.vessels.length;
        options.statusPanel?.updateFeed('Military', {
          status: militaryCount > 0 ? 'ok' : 'warning',
          itemCount: militaryCount,
        });
      }
      // Detect military airlift surges and foreign presence (suppress during learning mode)
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
    } catch (error) {
      console.error('[Intelligence] Military fetch failed:', error);
      dataFreshness.recordError('opensky', String(error));
    }
  })());

  // Fetch UCDP georeferenced events (battles, one-sided violence, non-state conflict)
  tasks.push((async () => {
    try {
      const [result, protestEvents] = await Promise.all([
        fetchUcdpEvents(),
        protestsTask,
      ]);
      if (!result.success) {
        dataFreshness.recordError('ucdp_events', 'UCDP events unavailable (retaining prior event state)');
        return;
      }
      const acledEvents = protestEvents.map((event) => ({
        latitude: event.lat,
        longitude: event.lon,
        event_date: event.time.toISOString(),
        fatalities: event.fatalities ?? 0,
      }));
      const events = deduplicateAgainstAcled(result.data, acledEvents);
      (options.panels['ucdp-events'] as UcdpEventsPanel)?.setEvents(events);
      if (options.mapLayers.ucdpEvents) {
        options.map?.setUcdpEvents(events);
      }
      if (events.length > 0) dataFreshness.recordUpdate('ucdp_events', events.length);
    } catch (error) {
      console.error('[Intelligence] UCDP events fetch failed:', error);
      dataFreshness.recordError('ucdp_events', String(error));
    }
  })());

  // Fetch UNHCR displacement data (refugees, asylum seekers, IDPs)
  tasks.push((async () => {
    try {
      const unhcrResult = await fetchUnhcrPopulation();
      if (!unhcrResult.ok) {
        dataFreshness.recordError('unhcr', 'UNHCR displacement unavailable (retaining prior displacement state)');
        return;
      }
      const data = unhcrResult.data;
      (options.panels['displacement'] as DisplacementPanel)?.setData(data);
      ingestDisplacementForCII(data.countries);
      if (options.mapLayers.displacement && data.topFlows) {
        options.map?.setDisplacementFlows(data.topFlows);
      }
      if (data.countries.length > 0) dataFreshness.recordUpdate('unhcr', data.countries.length);
    } catch (error) {
      console.error('[Intelligence] UNHCR displacement fetch failed:', error);
      dataFreshness.recordError('unhcr', String(error));
    }
  })());

  // Fetch climate anomalies (temperature/precipitation deviations)
  tasks.push((async () => {
    try {
      const climateResult = await fetchClimateAnomalies();
      if (!climateResult.ok) {
        dataFreshness.recordError('climate', 'Climate anomalies unavailable (retaining prior climate state)');
        return;
      }
      const anomalies = climateResult.anomalies;
      (options.panels['climate'] as ClimateAnomalyPanel)?.setAnomalies(anomalies);
      ingestClimateForCII(anomalies);
      if (options.mapLayers.climate) {
        options.map?.setClimateAnomalies(anomalies);
      }
      if (anomalies.length > 0) dataFreshness.recordUpdate('climate', anomalies.length);
    } catch (error) {
      console.error('[Intelligence] Climate anomalies fetch failed:', error);
      dataFreshness.recordError('climate', String(error));
    }
  })());

  await Promise.allSettled(tasks);

  // Fetch population exposure estimates after upstream intelligence loads complete.
  // This avoids race conditions where UCDP/protest data is still in-flight.
  try {
    const ucdpEvents = (options.panels['ucdp-events'] as UcdpEventsPanel)?.getEvents?.() || [];
    const events = [
      ...(options.intelligenceCache.protests?.events || []).slice(0, 10).map((event) => ({
        id: event.id,
        lat: event.lat,
        lon: event.lon,
        type: 'conflict' as const,
        name: event.title || 'Protest',
      })),
      ...ucdpEvents.slice(0, 10).map((event) => ({
        id: event.id,
        lat: event.latitude,
        lon: event.longitude,
        type: event.type_of_violence as string,
        name: `${event.side_a} vs ${event.side_b}`,
      })),
    ];
    if (events.length > 0) {
      const exposures = await enrichEventsWithExposure(events);
      (options.panels['population-exposure'] as PopulationExposurePanel)?.setExposures(exposures);
      if (exposures.length > 0) dataFreshness.recordUpdate('worldpop', exposures.length);
    }
  } catch (error) {
    console.error('[Intelligence] Population exposure fetch failed:', error);
    dataFreshness.recordError('worldpop', String(error));
  }

  // Trigger CII refresh with all intelligence data.
  (options.panels['cii'] as CIIPanel)?.refresh();
  console.log('[Intelligence] All signals loaded for CII calculation');
}
