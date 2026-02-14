import type { MapContainer, SearchModal, StatusPanel } from '@/components';
import { fetchEarthquakes, fetchNaturalEvents, fetchWeatherAlerts } from '@/services';
import { ingestEarthquakes } from '@/services/geo-convergence';
import { dataFreshness } from '@/services/data-freshness';

interface LoadNaturalFlowOptions {
  map: MapContainer | null;
  statusPanel: StatusPanel | null;
}

interface LoadTechEventsFlowOptions {
  siteVariant: string;
  techEventsLayerEnabled: boolean;
  map: MapContainer | null;
  statusPanel: StatusPanel | null;
  searchModal: SearchModal | null;
}

interface LoadWeatherAlertsFlowOptions {
  map: MapContainer | null;
  statusPanel: StatusPanel | null;
}

interface TechEventApiItem {
  id: string;
  title: string;
  location: string;
  coords: { lat: number; lng: number; country: string };
  startDate: string;
  endDate: string;
  url: string | null;
}

interface TechEventsResponse {
  success: boolean;
  error?: string;
  events: TechEventApiItem[];
}

export async function loadNaturalFlow(options: LoadNaturalFlowOptions): Promise<void> {
  const [earthquakeResult, eonetResult] = await Promise.allSettled([
    fetchEarthquakes(),
    fetchNaturalEvents(30),
  ]);

  if (earthquakeResult.status === 'fulfilled') {
    options.map?.setEarthquakes(earthquakeResult.value);
    ingestEarthquakes(earthquakeResult.value);
    options.statusPanel?.updateApi('USGS', { status: 'ok' });
    dataFreshness.recordUpdate('usgs', earthquakeResult.value.length);
  } else {
    options.map?.setEarthquakes([]);
    options.statusPanel?.updateApi('USGS', { status: 'error' });
    dataFreshness.recordError('usgs', String(earthquakeResult.reason));
  }

  if (eonetResult.status === 'fulfilled') {
    options.map?.setNaturalEvents(eonetResult.value);
    options.statusPanel?.updateFeed('EONET', {
      status: 'ok',
      itemCount: eonetResult.value.length,
    });
    options.statusPanel?.updateApi('NASA EONET', { status: 'ok' });
  } else {
    options.map?.setNaturalEvents([]);
    options.statusPanel?.updateFeed('EONET', {
      status: 'error',
      errorMessage: String(eonetResult.reason),
    });
    options.statusPanel?.updateApi('NASA EONET', { status: 'error' });
  }

  const hasEarthquakes = earthquakeResult.status === 'fulfilled' && earthquakeResult.value.length > 0;
  const hasEonet = eonetResult.status === 'fulfilled' && eonetResult.value.length > 0;
  options.map?.setLayerReady('natural', hasEarthquakes || hasEonet);
}

export async function loadTechEventsFlow(options: LoadTechEventsFlowOptions): Promise<void> {
  console.log(
    '[loadTechEvents] Called. SITE_VARIANT:',
    options.siteVariant,
    'techEvents layer:',
    options.techEventsLayerEnabled
  );

  if (options.siteVariant !== 'tech' && !options.techEventsLayerEnabled) {
    console.log('[loadTechEvents] Skipping - not tech variant and layer disabled');
    return;
  }

  try {
    const res = await fetch('/api/tech-events?type=conference&mappable=true&days=90&limit=50');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const data = (await res.json()) as TechEventsResponse;
    if (!data.success) throw new Error(data.error || 'Unknown error');

    const now = new Date();
    const mapEvents = data.events.map((event) => ({
      id: event.id,
      title: event.title,
      location: event.location,
      lat: event.coords.lat,
      lng: event.coords.lng,
      country: event.coords.country,
      startDate: event.startDate,
      endDate: event.endDate,
      url: event.url,
      daysUntil: Math.ceil(
        (new Date(event.startDate).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      ),
    }));

    options.map?.setTechEvents(mapEvents);
    options.map?.setLayerReady('techEvents', mapEvents.length > 0);
    options.statusPanel?.updateFeed('Tech Events', { status: 'ok', itemCount: mapEvents.length });

    if (options.siteVariant === 'tech' && options.searchModal) {
      options.searchModal.registerSource(
        'techevent',
        mapEvents.map((event) => ({
          id: event.id,
          title: event.title,
          subtitle: `${event.location} • ${new Date(event.startDate).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
          })}`,
          data: event,
        }))
      );
    }
  } catch (error) {
    console.error('[App] Failed to load tech events:', error);
    options.map?.setTechEvents([]);
    options.map?.setLayerReady('techEvents', false);
    options.statusPanel?.updateFeed('Tech Events', { status: 'error', errorMessage: String(error) });
  }
}

export async function loadWeatherAlertsFlow(
  options: LoadWeatherAlertsFlowOptions
): Promise<void> {
  try {
    const alerts = await fetchWeatherAlerts();
    options.map?.setWeatherAlerts(alerts);
    options.map?.setLayerReady('weather', alerts.length > 0);
    options.statusPanel?.updateFeed('Weather', { status: 'ok', itemCount: alerts.length });
    dataFreshness.recordUpdate('weather', alerts.length);
  } catch (error) {
    options.map?.setLayerReady('weather', false);
    options.statusPanel?.updateFeed('Weather', { status: 'error' });
    dataFreshness.recordError('weather', String(error));
  }
}
