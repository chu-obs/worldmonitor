import { INTEL_HOTSPOTS, CONFLICT_ZONES, MILITARY_BASES, UNDERSEA_CABLES, NUCLEAR_FACILITIES } from '@/config/geo';
import { PIPELINES } from '@/config/pipelines';
import { AI_DATA_CENTERS } from '@/config/ai-datacenters';
import { GAMMA_IRRADIATORS } from '@/config/irradiators';
import { TECH_COMPANIES } from '@/config/tech-companies';
import { AI_RESEARCH_LABS } from '@/config/ai-research-labs';
import { STARTUP_ECOSYSTEMS } from '@/config/startup-ecosystems';
import { TECH_HQS, ACCELERATORS } from '@/config/tech-geo';
import { SearchModal } from '@/components/SearchModal';

export interface SearchModalStaticOptions {
  placeholder: string;
  hint: string;
}

export function getSearchModalStaticOptions(siteVariant: string): SearchModalStaticOptions {
  return siteVariant === 'tech'
    ? {
        placeholder: 'Search companies, AI labs, startups, events...',
        hint: 'HQs • Companies • AI Labs • Startups • Accelerators • Events',
      }
    : {
        placeholder: 'Search news, pipelines, bases, markets...',
        hint: 'News • Hotspots • Conflicts • Bases • Pipelines • Cables • Datacenters',
      };
}

export function registerStaticSearchSources(searchModal: SearchModal, siteVariant: string): void {
  if (siteVariant === 'tech') {
    searchModal.registerSource('techcompany', TECH_COMPANIES.map((company) => ({
      id: company.id,
      title: company.name,
      subtitle: `${company.sector} ${company.city} ${company.keyProducts?.join(' ') || ''}`.trim(),
      data: company,
    })));

    searchModal.registerSource('ailab', AI_RESEARCH_LABS.map((lab) => ({
      id: lab.id,
      title: lab.name,
      subtitle: `${lab.type} ${lab.city} ${lab.focusAreas?.join(' ') || ''}`.trim(),
      data: lab,
    })));

    searchModal.registerSource('startup', STARTUP_ECOSYSTEMS.map((startup) => ({
      id: startup.id,
      title: startup.name,
      subtitle: `${startup.ecosystemTier} ${startup.topSectors?.join(' ') || ''} ${startup.notableStartups?.join(' ') || ''}`.trim(),
      data: startup,
    })));

    searchModal.registerSource('datacenter', AI_DATA_CENTERS.map((center) => ({
      id: center.id,
      title: center.name,
      subtitle: `${center.owner} ${center.chipType || ''}`.trim(),
      data: center,
    })));

    searchModal.registerSource('cable', UNDERSEA_CABLES.map((cable) => ({
      id: cable.id,
      title: cable.name,
      subtitle: cable.major ? 'Major internet backbone' : 'Undersea cable',
      data: cable,
    })));

    searchModal.registerSource('techhq', TECH_HQS.map((hq) => ({
      id: hq.id,
      title: hq.company,
      subtitle: `${hq.type === 'faang' ? 'Big Tech' : hq.type === 'unicorn' ? 'Unicorn' : 'Public'} • ${hq.city}, ${hq.country}`,
      data: hq,
    })));

    searchModal.registerSource('accelerator', ACCELERATORS.map((accelerator) => ({
      id: accelerator.id,
      title: accelerator.name,
      subtitle: `${accelerator.type} • ${accelerator.city}, ${accelerator.country}${accelerator.notable ? ` • ${accelerator.notable.slice(0, 2).join(', ')}` : ''}`,
      data: accelerator,
    })));
    return;
  }

  searchModal.registerSource('hotspot', INTEL_HOTSPOTS.map((hotspot) => ({
    id: hotspot.id,
    title: hotspot.name,
    subtitle: `${hotspot.subtext || ''} ${hotspot.keywords?.join(' ') || ''} ${hotspot.description || ''}`.trim(),
    data: hotspot,
  })));

  searchModal.registerSource('conflict', CONFLICT_ZONES.map((conflict) => ({
    id: conflict.id,
    title: conflict.name,
    subtitle: `${conflict.parties?.join(' ') || ''} ${conflict.keywords?.join(' ') || ''} ${conflict.description || ''}`.trim(),
    data: conflict,
  })));

  searchModal.registerSource('base', MILITARY_BASES.map((base) => ({
    id: base.id,
    title: base.name,
    subtitle: `${base.type} ${base.description || ''}`.trim(),
    data: base,
  })));

  searchModal.registerSource('pipeline', PIPELINES.map((pipeline) => ({
    id: pipeline.id,
    title: pipeline.name,
    subtitle: `${pipeline.type} ${pipeline.operator || ''} ${pipeline.countries?.join(' ') || ''}`.trim(),
    data: pipeline,
  })));

  searchModal.registerSource('cable', UNDERSEA_CABLES.map((cable) => ({
    id: cable.id,
    title: cable.name,
    subtitle: cable.major ? 'Major cable' : '',
    data: cable,
  })));

  searchModal.registerSource('datacenter', AI_DATA_CENTERS.map((center) => ({
    id: center.id,
    title: center.name,
    subtitle: `${center.owner} ${center.chipType || ''}`.trim(),
    data: center,
  })));

  searchModal.registerSource('nuclear', NUCLEAR_FACILITIES.map((facility) => ({
    id: facility.id,
    title: facility.name,
    subtitle: `${facility.type} ${facility.operator || ''}`.trim(),
    data: facility,
  })));

  searchModal.registerSource('irradiator', GAMMA_IRRADIATORS.map((irradiator) => ({
    id: irradiator.id,
    title: `${irradiator.city}, ${irradiator.country}`,
    subtitle: irradiator.organization || '',
    data: irradiator,
  })));
}
