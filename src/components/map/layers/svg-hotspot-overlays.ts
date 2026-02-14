import type { GeoProjection } from 'd3';
import { escapeHtml } from '@/utils/sanitize';
import type { Hotspot, NewsItem } from '@/types';

export interface HotspotWithBreaking extends Hotspot {
  hasBreaking?: boolean;
}

interface HotspotOverlayRenderOptions {
  projection: GeoProjection;
  overlays: HTMLElement;
  hotspots: HotspotWithBreaking[];
  getRelatedNews: (hotspot: Hotspot) => NewsItem[];
  onHotspotClick: (event: MouseEvent, hotspot: Hotspot, relatedNews: NewsItem[]) => void;
}

export function renderHotspotOverlayMarkers(options: HotspotOverlayRenderOptions): void {
  options.hotspots.forEach((hotspot) => {
    const pos = options.projection([hotspot.lon, hotspot.lat]);
    if (!pos) return;

    const div = document.createElement('div');
    div.className = 'hotspot';
    div.style.left = `${pos[0]}px`;
    div.style.top = `${pos[1]}px`;

    const breakingBadge = hotspot.hasBreaking ? '<div class="hotspot-breaking">BREAKING</div>' : '';
    div.innerHTML = `
      ${breakingBadge}
      <div class="hotspot-marker ${escapeHtml(hotspot.level || 'low')}"></div>
    `;

    div.addEventListener('click', (event) => {
      event.stopPropagation();
      const relatedNews = options.getRelatedNews(hotspot);
      options.onHotspotClick(event, hotspot, relatedNews);
    });

    options.overlays.appendChild(div);
  });
}
