import type { PopupType } from '../../MapPopup';

export type OverlayPopupHandler = (event: MouseEvent, type: PopupType, data: unknown) => void;

interface Cluster<T> {
  items: T[];
  pos: [number, number];
}

interface TechHqItemLike {
  type: string;
  company: string;
  city: string;
  country: string;
}

interface TechEventItemLike {
  title: string;
  location: string;
  country: string;
  daysUntil: number;
}

interface TechClusterRenderOptions<T> {
  overlays: HTMLElement;
  clusters: Array<Cluster<T>>;
  zoom: number;
  onMarkerClick: OverlayPopupHandler;
}

export function renderTechHqClusterOverlayMarkers<T extends TechHqItemLike>(
  options: TechClusterRenderOptions<T>,
): void {
  options.clusters.forEach((cluster) => {
    if (cluster.items.length === 0) return;

    const div = document.createElement('div');
    const isCluster = cluster.items.length > 1;
    const primaryItem = cluster.items[0]!;
    div.className = `tech-hq-marker ${primaryItem.type} ${isCluster ? 'cluster' : ''}`;
    div.style.left = `${cluster.pos[0]}px`;
    div.style.top = `${cluster.pos[1]}px`;

    const icon = document.createElement('div');
    icon.className = 'tech-hq-icon';

    if (isCluster) {
      const unicornCount = cluster.items.filter((h) => h.type === 'unicorn').length;
      const faangCount = cluster.items.filter((h) => h.type === 'faang').length;
      icon.textContent = faangCount > 0 ? '🏛️' : unicornCount > 0 ? '🦄' : '🏢';

      const badge = document.createElement('div');
      badge.className = 'cluster-badge';
      badge.textContent = String(cluster.items.length);
      div.appendChild(badge);

      div.title = cluster.items.map((h) => h.company).join(', ');
    } else {
      icon.textContent = primaryItem.type === 'faang' ? '🏛️' : primaryItem.type === 'unicorn' ? '🦄' : '🏢';
    }
    div.appendChild(icon);

    if (!isCluster && (options.zoom >= 3 || primaryItem.type === 'faang')) {
      const label = document.createElement('div');
      label.className = 'tech-hq-label';
      label.textContent = primaryItem.company;
      div.appendChild(label);
    }

    div.addEventListener('click', (event) => {
      event.stopPropagation();
      if (isCluster) {
        options.onMarkerClick(event, 'techHQCluster', {
          items: cluster.items,
          city: primaryItem.city,
          country: primaryItem.country,
        });
      } else {
        options.onMarkerClick(event, 'techHQ', primaryItem);
      }
    });

    options.overlays.appendChild(div);
  });
}

export function renderTechEventClusterOverlayMarkers<T extends TechEventItemLike>(
  options: TechClusterRenderOptions<T>,
): void {
  options.clusters.forEach((cluster) => {
    if (cluster.items.length === 0) return;

    const div = document.createElement('div');
    const isCluster = cluster.items.length > 1;
    const primaryEvent = cluster.items[0]!;
    const hasUpcomingSoon = cluster.items.some((event) => event.daysUntil <= 14);

    div.className = `tech-event-marker ${hasUpcomingSoon ? 'upcoming-soon' : ''} ${isCluster ? 'cluster' : ''}`;
    div.style.left = `${cluster.pos[0]}px`;
    div.style.top = `${cluster.pos[1]}px`;

    if (isCluster) {
      const badge = document.createElement('div');
      badge.className = 'cluster-badge';
      badge.textContent = String(cluster.items.length);
      div.appendChild(badge);
      div.title = cluster.items.map((event) => event.title).join(', ');
    }

    div.addEventListener('click', (event) => {
      event.stopPropagation();
      if (isCluster) {
        options.onMarkerClick(event, 'techEventCluster', {
          items: cluster.items,
          location: primaryEvent.location,
          country: primaryEvent.country,
        });
      } else {
        options.onMarkerClick(event, 'techEvent', primaryEvent);
      }
    });

    options.overlays.appendChild(div);
  });
}
