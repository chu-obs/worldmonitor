import type { GeoProjection } from 'd3';
import { MILITARY_BASES, NUCLEAR_FACILITIES } from '@/config';
import type { PopupType } from '../../MapPopup';

export type OverlayPopupHandler = (event: MouseEvent, type: PopupType, data: unknown) => void;

interface BaseOverlayRenderOptions {
  projection: GeoProjection;
  overlays: HTMLElement;
  onMarkerClick: OverlayPopupHandler;
}

interface HighlightedOverlayRenderOptions extends BaseOverlayRenderOptions {
  highlightedIds: Set<string>;
}

export function renderNuclearOverlayMarkers(options: HighlightedOverlayRenderOptions): void {
  NUCLEAR_FACILITIES.forEach((facility) => {
    const pos = options.projection([facility.lon, facility.lat]);
    if (!pos) return;

    const div = document.createElement('div');
    const isHighlighted = options.highlightedIds.has(facility.id);
    div.className = `nuclear-marker ${facility.status}${isHighlighted ? ' asset-highlight asset-highlight-nuclear' : ''}`;
    div.style.left = `${pos[0]}px`;
    div.style.top = `${pos[1]}px`;
    div.title = `${facility.name} (${facility.type})`;

    div.addEventListener('click', (event) => {
      event.stopPropagation();
      options.onMarkerClick(event, 'nuclear', facility);
    });

    options.overlays.appendChild(div);
  });
}

export function renderBaseOverlayMarkers(options: HighlightedOverlayRenderOptions): void {
  MILITARY_BASES.forEach((base) => {
    const pos = options.projection([base.lon, base.lat]);
    if (!pos) return;

    const div = document.createElement('div');
    const isHighlighted = options.highlightedIds.has(base.id);
    div.className = `base-marker ${base.type}${isHighlighted ? ' asset-highlight asset-highlight-base' : ''}`;
    div.style.left = `${pos[0]}px`;
    div.style.top = `${pos[1]}px`;

    const label = document.createElement('div');
    label.className = 'base-label';
    label.textContent = base.name;
    div.appendChild(label);

    div.addEventListener('click', (event) => {
      event.stopPropagation();
      options.onMarkerClick(event, 'base', base);
    });

    options.overlays.appendChild(div);
  });
}
