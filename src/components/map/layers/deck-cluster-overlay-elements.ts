import type { SocialUnrestEvent } from '@/types';
import type { PopupType } from '../../MapPopup';

export type PopupClickHandler = (event: MouseEvent, type: PopupType, data: unknown) => void;

export interface ScreenCluster<T> {
  items: T[];
  center: [number, number];
  screenPos: [number, number];
}

interface TechHqLike {
  type: string;
  company: string;
  city: string;
  country: string;
}

interface TechEventLike {
  title: string;
  location: string;
  country: string;
  daysUntil: number;
  lon: number;
}

interface DatacenterLike {
  status: string;
  chipCount: number;
  owner: string;
  name: string;
  country: string;
}

interface BaseOverlayOptions {
  onPopupClick: PopupClickHandler;
}

interface TechHqClusterOptions<T extends TechHqLike> extends BaseOverlayOptions {
  cluster: ScreenCluster<T>;
  zoom: number;
}

interface TechEventClusterOptions<T extends TechEventLike> extends BaseOverlayOptions {
  cluster: ScreenCluster<T>;
}

interface ProtestClusterOptions extends BaseOverlayOptions {
  cluster: ScreenCluster<SocialUnrestEvent>;
}

interface DatacenterClusterOptions<T extends DatacenterLike> extends BaseOverlayOptions {
  cluster: ScreenCluster<T>;
  zoom: number;
}

export function createTechHqClusterOverlayElement<T extends TechHqLike>(options: TechHqClusterOptions<T>): HTMLElement {
  const primaryItem = options.cluster.items[0]!;
  const isCluster = options.cluster.items.length > 1;
  const unicornCount = options.cluster.items.filter(h => h.type === 'unicorn').length;
  const faangCount = options.cluster.items.filter(h => h.type === 'faang').length;

  const div = document.createElement('div');
  div.className = `tech-hq-marker ${primaryItem.type} ${isCluster ? 'cluster' : ''}`;
  div.style.cssText = 'pointer-events: auto; cursor: pointer;';

  const icon = document.createElement('div');
  icon.className = 'tech-hq-icon';
  icon.textContent = faangCount > 0 ? '🏛️' : unicornCount > 0 ? '🦄' : '🏢';
  div.appendChild(icon);

  if (isCluster) {
    const badge = document.createElement('div');
    badge.className = 'cluster-badge';
    badge.textContent = String(options.cluster.items.length);
    div.appendChild(badge);
    div.title = options.cluster.items.map(h => h.company).join(', ');
  } else {
    if (options.zoom >= 3 || primaryItem.type === 'faang') {
      const label = document.createElement('div');
      label.className = 'tech-hq-label';
      label.textContent = primaryItem.company;
      div.appendChild(label);
    }
    div.title = primaryItem.company;
  }

  div.addEventListener('click', (event) => {
    event.stopPropagation();
    if (isCluster) {
      options.onPopupClick(event, 'techHQCluster', {
        items: options.cluster.items,
        city: primaryItem.city,
        country: primaryItem.country,
      });
    } else {
      options.onPopupClick(event, 'techHQ', primaryItem);
    }
  });

  return div;
}

export function createTechEventClusterOverlayElement<T extends TechEventLike>(options: TechEventClusterOptions<T>): HTMLElement {
  const primaryEvent = options.cluster.items[0]!;
  const isCluster = options.cluster.items.length > 1;
  const hasUpcomingSoon = options.cluster.items.some(e => e.daysUntil <= 14);

  const div = document.createElement('div');
  div.className = `tech-event-marker ${hasUpcomingSoon ? 'upcoming-soon' : ''} ${isCluster ? 'cluster' : ''}`;
  div.style.cssText = 'pointer-events: auto; cursor: pointer;';

  const icon = document.createElement('div');
  icon.className = 'tech-event-icon';
  icon.textContent = '📅';
  div.appendChild(icon);

  if (isCluster) {
    const badge = document.createElement('div');
    badge.className = 'cluster-badge';
    badge.textContent = String(options.cluster.items.length);
    div.appendChild(badge);
    div.title = options.cluster.items.map(e => e.title).join(', ');
  } else {
    div.title = primaryEvent.title;
  }

  div.addEventListener('click', (event) => {
    event.stopPropagation();
    if (isCluster) {
      options.onPopupClick(event, 'techEventCluster', {
        items: options.cluster.items.map(({ lon, ...rest }) => rest),
        location: primaryEvent.location,
        country: primaryEvent.country,
      });
    } else {
      options.onPopupClick(event, 'techEvent', primaryEvent);
    }
  });

  return div;
}

export function createProtestClusterOverlayElement(options: ProtestClusterOptions): HTMLElement {
  const primaryEvent = options.cluster.items[0]!;
  const isCluster = options.cluster.items.length > 1;
  const hasRiot = options.cluster.items.some(e => e.eventType === 'riot');
  const hasHighSeverity = options.cluster.items.some(e => e.severity === 'high');

  const div = document.createElement('div');
  div.className = `protest-marker ${hasHighSeverity ? 'high' : primaryEvent.severity} ${hasRiot ? 'riot' : primaryEvent.eventType} ${isCluster ? 'cluster' : ''}`;
  div.style.cssText = 'pointer-events: auto; cursor: pointer;';

  const icon = document.createElement('div');
  icon.className = 'protest-icon';
  icon.textContent = hasRiot ? '🔥' : primaryEvent.eventType === 'strike' ? '✊' : '✦';
  div.appendChild(icon);

  if (isCluster) {
    const badge = document.createElement('div');
    badge.className = 'cluster-badge';
    badge.textContent = String(options.cluster.items.length);
    div.appendChild(badge);
    div.title = `${primaryEvent.country}: ${options.cluster.items.length} events`;
  } else {
    div.title = `${primaryEvent.city || primaryEvent.country} - ${primaryEvent.eventType} (${primaryEvent.severity})`;
    if (primaryEvent.validated) {
      div.classList.add('validated');
    }
  }

  div.addEventListener('click', (event) => {
    event.stopPropagation();
    if (isCluster) {
      options.onPopupClick(event, 'protestCluster', {
        items: options.cluster.items,
        country: primaryEvent.country,
      });
    } else {
      options.onPopupClick(event, 'protest', primaryEvent);
    }
  });

  return div;
}

export function createDatacenterClusterOverlayElement<T extends DatacenterLike>(options: DatacenterClusterOptions<T>): HTMLElement {
  const primaryDC = options.cluster.items[0]!;
  const isCluster = options.cluster.items.length > 1;
  const totalChips = options.cluster.items.reduce((sum, dc) => sum + dc.chipCount, 0);
  const hasPlanned = options.cluster.items.some(dc => dc.status === 'planned');
  const hasExisting = options.cluster.items.some(dc => dc.status === 'existing');

  const div = document.createElement('div');
  div.className = `datacenter-marker ${hasPlanned && !hasExisting ? 'planned' : 'existing'} ${isCluster ? 'cluster' : ''}`;
  div.style.cssText = 'pointer-events: auto; cursor: pointer;';

  const icon = document.createElement('div');
  icon.className = 'datacenter-icon';
  icon.textContent = '🖥️';
  div.appendChild(icon);

  if (isCluster) {
    const badge = document.createElement('div');
    badge.className = 'cluster-badge';
    badge.textContent = String(options.cluster.items.length);
    div.appendChild(badge);

    const formatNum = (n: number) => n >= 1000000 ? `${(n / 1000000).toFixed(1)}M` : n >= 1000 ? `${(n / 1000).toFixed(0)}K` : String(n);
    div.title = `${options.cluster.items.length} data centers • ${formatNum(totalChips)} chips`;
  } else {
    if (options.zoom >= 4) {
      const label = document.createElement('div');
      label.className = 'datacenter-label';
      label.textContent = primaryDC.owner.split(',')[0] || primaryDC.name.slice(0, 15);
      div.appendChild(label);
    }
    div.title = primaryDC.name;
  }

  div.addEventListener('click', (event) => {
    event.stopPropagation();
    if (isCluster) {
      options.onPopupClick(event, 'datacenterCluster', {
        items: options.cluster.items,
        region: primaryDC.country,
        country: primaryDC.country,
      });
    } else {
      options.onPopupClick(event, 'datacenter', primaryDC);
    }
  });

  return div;
}
