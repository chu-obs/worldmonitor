import type { NewsItem, MapLayers } from '@/types';
import type { SearchResult } from '@/components/SearchModal';
import type { MapContainer } from '@/components';
import { INTEL_HOTSPOTS, CONFLICT_ZONES, MILITARY_BASES, UNDERSEA_CABLES, NUCLEAR_FACILITIES } from '@/config/geo';
import { PIPELINES } from '@/config/pipelines';
import { AI_DATA_CENTERS } from '@/config/ai-datacenters';
import { GAMMA_IRRADIATORS } from '@/config/irradiators';
import { TECH_COMPANIES } from '@/config/tech-companies';
import { AI_RESEARCH_LABS } from '@/config/ai-research-labs';
import { STARTUP_ECOSYSTEMS } from '@/config/startup-ecosystems';
import { TECH_HQS, ACCELERATORS } from '@/config/tech-geo';

interface SearchResultDispatchOptions {
  result: SearchResult;
  map: MapContainer | null;
  mapLayers: MapLayers;
  scrollToPanel: (panelId: string) => void;
  highlightNewsItem: (itemId: string) => void;
}

function withDelay(callback: () => void): void {
  setTimeout(callback, 300);
}

export function dispatchSearchResult(options: SearchResultDispatchOptions): void {
  const { result, map, mapLayers, scrollToPanel, highlightNewsItem } = options;

  switch (result.type) {
    case 'news': {
      const item = result.data as NewsItem;
      scrollToPanel('politics');
      highlightNewsItem(item.link);
      break;
    }
    case 'hotspot': {
      const hotspot = result.data as typeof INTEL_HOTSPOTS[0];
      map?.setView('global');
      withDelay(() => {
        map?.triggerHotspotClick(hotspot.id);
      });
      break;
    }
    case 'conflict': {
      const conflict = result.data as typeof CONFLICT_ZONES[0];
      map?.setView('global');
      withDelay(() => {
        map?.triggerConflictClick(conflict.id);
      });
      break;
    }
    case 'market':
      scrollToPanel('markets');
      break;
    case 'prediction':
      scrollToPanel('polymarket');
      break;
    case 'base': {
      const base = result.data as typeof MILITARY_BASES[0];
      map?.setView('global');
      withDelay(() => {
        map?.triggerBaseClick(base.id);
      });
      break;
    }
    case 'pipeline': {
      const pipeline = result.data as typeof PIPELINES[0];
      map?.setView('global');
      map?.enableLayer('pipelines');
      mapLayers.pipelines = true;
      withDelay(() => {
        map?.triggerPipelineClick(pipeline.id);
      });
      break;
    }
    case 'cable': {
      const cable = result.data as typeof UNDERSEA_CABLES[0];
      map?.setView('global');
      map?.enableLayer('cables');
      mapLayers.cables = true;
      withDelay(() => {
        map?.triggerCableClick(cable.id);
      });
      break;
    }
    case 'datacenter': {
      const center = result.data as typeof AI_DATA_CENTERS[0];
      map?.setView('global');
      map?.enableLayer('datacenters');
      mapLayers.datacenters = true;
      withDelay(() => {
        map?.triggerDatacenterClick(center.id);
      });
      break;
    }
    case 'nuclear': {
      const facility = result.data as typeof NUCLEAR_FACILITIES[0];
      map?.setView('global');
      map?.enableLayer('nuclear');
      mapLayers.nuclear = true;
      withDelay(() => {
        map?.triggerNuclearClick(facility.id);
      });
      break;
    }
    case 'irradiator': {
      const irradiator = result.data as typeof GAMMA_IRRADIATORS[0];
      map?.setView('global');
      map?.enableLayer('irradiators');
      mapLayers.irradiators = true;
      withDelay(() => {
        map?.triggerIrradiatorClick(irradiator.id);
      });
      break;
    }
    case 'earthquake':
    case 'outage':
      map?.setView('global');
      break;
    case 'techcompany': {
      const company = result.data as typeof TECH_COMPANIES[0];
      map?.setView('global');
      map?.enableLayer('techHQs');
      mapLayers.techHQs = true;
      withDelay(() => {
        map?.setCenter(company.lat, company.lon, 4);
      });
      break;
    }
    case 'ailab': {
      const lab = result.data as typeof AI_RESEARCH_LABS[0];
      map?.setView('global');
      withDelay(() => {
        map?.setCenter(lab.lat, lab.lon, 4);
      });
      break;
    }
    case 'startup': {
      const ecosystem = result.data as typeof STARTUP_ECOSYSTEMS[0];
      map?.setView('global');
      map?.enableLayer('startupHubs');
      mapLayers.startupHubs = true;
      withDelay(() => {
        map?.setCenter(ecosystem.lat, ecosystem.lon, 4);
      });
      break;
    }
    case 'techevent':
      map?.setView('global');
      map?.enableLayer('techEvents');
      mapLayers.techEvents = true;
      break;
    case 'techhq': {
      const hq = result.data as typeof TECH_HQS[0];
      map?.setView('global');
      map?.enableLayer('techHQs');
      mapLayers.techHQs = true;
      withDelay(() => {
        map?.setCenter(hq.lat, hq.lon, 4);
      });
      break;
    }
    case 'accelerator': {
      const accelerator = result.data as typeof ACCELERATORS[0];
      map?.setView('global');
      map?.enableLayer('accelerators');
      mapLayers.accelerators = true;
      withDelay(() => {
        map?.setCenter(accelerator.lat, accelerator.lon, 4);
      });
      break;
    }
  }
}
