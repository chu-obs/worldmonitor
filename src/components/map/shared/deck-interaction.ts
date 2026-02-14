import { CONFLICT_ZONES, UNDERSEA_CABLES } from '@/config';
import { escapeHtml } from '@/utils/sanitize';
import type { PopupType } from '../../MapPopup';

type DeckObj = Record<string, unknown>;

const DECK_LAYER_POPUP_TYPES: Record<string, PopupType> = {
  'conflict-zones-layer': 'conflict',
  'bases-layer': 'base',
  'nuclear-layer': 'nuclear',
  'irradiators-layer': 'irradiator',
  'datacenters-layer': 'datacenter',
  'cables-layer': 'cable',
  'pipelines-layer': 'pipeline',
  'earthquakes-layer': 'earthquake',
  'weather-layer': 'weather',
  'outages-layer': 'outage',
  'protests-layer': 'protest',
  'military-flights-layer': 'militaryFlight',
  'military-vessels-layer': 'militaryVessel',
  'military-vessel-clusters-layer': 'militaryVesselCluster',
  'military-flight-clusters-layer': 'militaryFlightCluster',
  'natural-events-layer': 'natEvent',
  'waterways-layer': 'waterway',
  'economic-centers-layer': 'economic',
  'spaceports-layer': 'spaceport',
  'ports-layer': 'port',
  'flight-delays-layer': 'flight',
  'startup-hubs-layer': 'startupHub',
  'tech-hqs-layer': 'techHQ',
  'accelerators-layer': 'accelerator',
  'cloud-regions-layer': 'cloudRegion',
  'tech-events-layer': 'techEvent',
  'apt-groups-layer': 'apt',
  'minerals-layer': 'mineral',
  'ais-disruptions-layer': 'ais',
  'cable-advisories-layer': 'cable-advisory',
  'repair-ships-layer': 'repair-ship',
};

function text(value: unknown): string {
  return escapeHtml(String(value ?? ''));
}

export function getDeckTooltipHtml(layerId: string, obj: DeckObj): string | null {
  switch (layerId) {
    case 'hotspots-layer':
      return `<div class="deckgl-tooltip"><strong>${text(obj.name)}</strong><br/>${text(obj.subtext)}</div>`;
    case 'earthquakes-layer':
      return `<div class="deckgl-tooltip"><strong>M${(Number(obj.magnitude) || 0).toFixed(1)} Earthquake</strong><br/>${text(obj.place)}</div>`;
    case 'military-vessels-layer':
      return `<div class="deckgl-tooltip"><strong>${text(obj.name)}</strong><br/>${text(obj.operatorCountry)}</div>`;
    case 'military-flights-layer':
      return `<div class="deckgl-tooltip"><strong>${text(obj.callsign || obj.registration || 'Military Aircraft')}</strong><br/>${text(obj.type)}</div>`;
    case 'military-vessel-clusters-layer':
      return `<div class="deckgl-tooltip"><strong>${text(obj.name || 'Vessel Cluster')}</strong><br/>${Number(obj.vesselCount) || 0} vessels<br/>${text(obj.activityType)}</div>`;
    case 'military-flight-clusters-layer':
      return `<div class="deckgl-tooltip"><strong>${text(obj.name || 'Flight Cluster')}</strong><br/>${Number(obj.flightCount) || 0} aircraft<br/>${text(obj.activityType)}</div>`;
    case 'protests-layer':
      return `<div class="deckgl-tooltip"><strong>${text(obj.title)}</strong><br/>${text(obj.country)}</div>`;
    case 'bases-layer':
      return `<div class="deckgl-tooltip"><strong>${text(obj.name)}</strong><br/>${text(obj.country)}</div>`;
    case 'nuclear-layer':
      return `<div class="deckgl-tooltip"><strong>${text(obj.name)}</strong><br/>${text(obj.type)}</div>`;
    case 'datacenters-layer':
      return `<div class="deckgl-tooltip"><strong>${text(obj.name)}</strong><br/>${text(obj.owner)}</div>`;
    case 'cables-layer':
      return `<div class="deckgl-tooltip"><strong>${text(obj.name)}</strong><br/>Undersea Cable</div>`;
    case 'pipelines-layer':
      return `<div class="deckgl-tooltip"><strong>${text(obj.name)}</strong><br/>${text(obj.type)} Pipeline</div>`;
    case 'conflict-zones-layer': {
      const props = ((obj.properties as DeckObj | undefined) || obj) as DeckObj;
      return `<div class="deckgl-tooltip"><strong>${text(props.name)}</strong><br/>Conflict Zone</div>`;
    }
    case 'natural-events-layer':
      return `<div class="deckgl-tooltip"><strong>${text(obj.title)}</strong><br/>${text(obj.category || 'Natural Event')}</div>`;
    case 'ais-density-layer':
      return `<div class="deckgl-tooltip"><strong>Ship Traffic</strong><br/>Intensity: ${text(obj.intensity)}</div>`;
    case 'waterways-layer':
      return `<div class="deckgl-tooltip"><strong>${text(obj.name)}</strong><br/>Strategic Waterway</div>`;
    case 'economic-centers-layer':
      return `<div class="deckgl-tooltip"><strong>${text(obj.name)}</strong><br/>${text(obj.country)}</div>`;
    case 'startup-hubs-layer':
      return `<div class="deckgl-tooltip"><strong>${text(obj.city)}</strong><br/>${text(obj.country)}</div>`;
    case 'tech-hqs-layer':
      return `<div class="deckgl-tooltip"><strong>${text(obj.company)}</strong><br/>${text(obj.city)}</div>`;
    case 'accelerators-layer':
      return `<div class="deckgl-tooltip"><strong>${text(obj.name)}</strong><br/>${text(obj.city)}</div>`;
    case 'cloud-regions-layer':
      return `<div class="deckgl-tooltip"><strong>${text(obj.provider)}</strong><br/>${text(obj.region)}</div>`;
    case 'tech-events-layer':
      return `<div class="deckgl-tooltip"><strong>${text(obj.title)}</strong><br/>${text(obj.location)}</div>`;
    case 'irradiators-layer':
      return `<div class="deckgl-tooltip"><strong>${text(obj.name)}</strong><br/>${text(obj.type || 'Gamma Irradiator')}</div>`;
    case 'spaceports-layer':
      return `<div class="deckgl-tooltip"><strong>${text(obj.name)}</strong><br/>${text(obj.country || 'Spaceport')}</div>`;
    case 'ports-layer': {
      const typeValue = text(obj.type);
      const typeIcon = obj.type === 'naval' ? '⚓' : obj.type === 'oil' || obj.type === 'lng' ? '🛢️' : '🏭';
      return `<div class="deckgl-tooltip"><strong>${typeIcon} ${text(obj.name)}</strong><br/>${typeValue} - ${text(obj.country)}</div>`;
    }
    case 'flight-delays-layer':
      return `<div class="deckgl-tooltip"><strong>${text(obj.airport)}</strong><br/>${text(obj.severity)}: ${text(obj.reason)}</div>`;
    case 'apt-groups-layer':
      return `<div class="deckgl-tooltip"><strong>${text(obj.name)}</strong><br/>${text(obj.aka)}<br/>Sponsor: ${text(obj.sponsor)}</div>`;
    case 'minerals-layer':
      return `<div class="deckgl-tooltip"><strong>${text(obj.name)}</strong><br/>${text(obj.mineral)} - ${text(obj.country)}<br/>${text(obj.operator)}</div>`;
    case 'ais-disruptions-layer':
      return `<div class="deckgl-tooltip"><strong>AIS ${text(obj.type || 'Disruption')}</strong><br/>${text(obj.severity)} severity<br/>${text(obj.description)}</div>`;
    case 'cable-advisories-layer': {
      const cableName = UNDERSEA_CABLES.find((cable) => cable.id === obj.cableId)?.name || obj.cableId;
      return `<div class="deckgl-tooltip"><strong>${text(cableName)}</strong><br/>${text(obj.severity || 'Advisory')}<br/>${text(obj.description)}</div>`;
    }
    case 'repair-ships-layer':
      return `<div class="deckgl-tooltip"><strong>${text(obj.name || 'Repair Ship')}</strong><br/>${text(obj.status)}</div>`;
    case 'weather-layer': {
      const areaDesc = typeof obj.areaDesc === 'string' ? obj.areaDesc : '';
      const area = areaDesc ? `<br/><small>${text(areaDesc.slice(0, 50))}${areaDesc.length > 50 ? '...' : ''}</small>` : '';
      return `<div class="deckgl-tooltip"><strong>${text(obj.event || 'Weather Alert')}</strong><br/>${text(obj.severity)}${area}</div>`;
    }
    case 'outages-layer':
      return `<div class="deckgl-tooltip"><strong>${text(obj.asn || 'Internet Outage')}</strong><br/>${text(obj.country)}</div>`;
    case 'news-locations-layer':
      return `<div class="deckgl-tooltip"><strong>📰 News</strong><br/>${text((obj.title as string | undefined)?.slice(0, 80) || '')}</div>`;
    default:
      return null;
  }
}

export function resolveDeckClickPopup(
  layerId: string,
  object: DeckObj,
): { popupType: PopupType; data: unknown } | null {
  const popupType = DECK_LAYER_POPUP_TYPES[layerId];
  if (!popupType) return null;

  if (layerId === 'conflict-zones-layer' && object.properties && typeof object.properties === 'object') {
    const props = object.properties as DeckObj;
    const conflictId = props.id;
    const fullConflict = CONFLICT_ZONES.find((zone) => zone.id === conflictId);
    if (fullConflict) {
      return { popupType, data: fullConflict };
    }
  }

  return { popupType, data: object };
}
