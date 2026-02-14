export interface HotspotOverlayLike {
  lat: number;
  lon: number;
  level?: string;
  hasBreaking?: boolean;
  escalationScore?: number;
}

export function getHotspotMarkerScale(zoom: number): number {
  return zoom < 2.5 ? 0.7 : zoom < 4 ? 0.85 : 1.0;
}

export function getSortedHighActivityHotspots<T extends HotspotOverlayLike>(hotspots: T[]): T[] {
  return hotspots
    .filter((hotspot) => hotspot.level === 'high' || hotspot.hasBreaking)
    .sort((a, b) => (b.escalationScore || 0) - (a.escalationScore || 0));
}

export function applyHotspotOverlayTransform(
  element: HTMLElement,
  x: number,
  y: number,
  markerScale: number,
): void {
  element.style.transform = `translate(${x - 16}px, ${y - 16}px) scale(${markerScale})`;
}

function normalizeHotspotLevel(level?: string): 'low' | 'elevated' | 'high' {
  if (level === 'high' || level === 'elevated') return level;
  return 'low';
}

interface CreateHotspotOverlayElementOptions<T extends HotspotOverlayLike> {
  hotspot: T;
  key: string;
  x: number;
  y: number;
  markerScale: number;
  onClick: (event: MouseEvent) => void;
}

export function createHotspotOverlayElement<T extends HotspotOverlayLike>(
  options: CreateHotspotOverlayElementOptions<T>,
): HTMLElement {
  const div = document.createElement('div');
  div.className = 'hotspot';
  div.style.cssText = 'position: absolute; left: 0; top: 0; pointer-events: auto; cursor: pointer; z-index: 100;';
  div.dataset.clusterKey = options.key;
  applyHotspotOverlayTransform(div, options.x, options.y, options.markerScale);

  const marker = document.createElement('div');
  marker.className = `hotspot-marker ${normalizeHotspotLevel(options.hotspot.level)}`;
  div.appendChild(marker);

  div.addEventListener('click', (event) => {
    event.stopPropagation();
    options.onClick(event);
  });

  return div;
}

export function parseHotspotClusterKey(key: string): [number, number] | null {
  const match = /^hotspot-(-?\d+\.\d+)-(-?\d+\.\d+)-\d+$/.exec(key);
  if (!match) return null;

  const lon = Number(match[1]);
  const lat = Number(match[2]);
  if (!Number.isFinite(lon) || !Number.isFinite(lat)) return null;
  return [lon, lat];
}
