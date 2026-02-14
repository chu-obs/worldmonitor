import type { GeoProjection } from 'd3';
import { getNaturalEventIcon } from '@/services/eonet';
import type { NaturalEvent } from '@/types';
import type { PopupType } from '../../MapPopup';

export type OverlayPopupHandler = (event: MouseEvent, type: PopupType, data: unknown) => void;

interface NaturalEventOverlayRenderOptions {
  projection: GeoProjection;
  overlays: HTMLElement;
  naturalEvents: NaturalEvent[];
  zoom: number;
  onMarkerClick: OverlayPopupHandler;
}

interface FireOverlayPoint {
  lat: number;
  lon: number;
  brightness: number;
  frp: number;
  confidence: number;
  region: string;
  acq_date: string;
  daynight: string;
}

interface FireOverlayRenderOptions {
  projection: GeoProjection;
  overlays: HTMLElement;
  fires: FireOverlayPoint[];
}

export function renderNaturalEventOverlayMarkers(options: NaturalEventOverlayRenderOptions): void {
  options.naturalEvents.forEach((event) => {
    const pos = options.projection([event.lon, event.lat]);
    if (!pos) return;

    const div = document.createElement('div');
    div.className = `nat-event-marker ${event.category}`;
    div.style.left = `${pos[0]}px`;
    div.style.top = `${pos[1]}px`;

    const icon = document.createElement('div');
    icon.className = 'nat-event-icon';
    icon.textContent = getNaturalEventIcon(event.category);
    div.appendChild(icon);

    if (options.zoom >= 2) {
      const label = document.createElement('div');
      label.className = 'nat-event-label';
      label.textContent = event.title.length > 25 ? `${event.title.slice(0, 25)}…` : event.title;
      div.appendChild(label);
    }

    if (event.magnitude) {
      const magnitude = document.createElement('div');
      magnitude.className = 'nat-event-magnitude';
      magnitude.textContent = `${event.magnitude}${event.magnitudeUnit ? ` ${event.magnitudeUnit}` : ''}`;
      div.appendChild(magnitude);
    }

    div.addEventListener('click', (markerEvent) => {
      markerEvent.stopPropagation();
      options.onMarkerClick(markerEvent, 'natEvent', event);
    });

    options.overlays.appendChild(div);
  });
}

export function renderFireOverlayMarkers(options: FireOverlayRenderOptions): void {
  options.fires.forEach((fire) => {
    const pos = options.projection([fire.lon, fire.lat]);
    if (!pos) return;

    const color = fire.brightness > 400 ? '#ff1e00' : fire.brightness > 350 ? '#ff8c00' : '#ffdc32';
    const size = Math.max(4, Math.min(10, (fire.frp || 1) * 0.5));

    const dot = document.createElement('div');
    dot.className = 'fire-dot';
    dot.style.left = `${pos[0]}px`;
    dot.style.top = `${pos[1]}px`;
    dot.style.width = `${size}px`;
    dot.style.height = `${size}px`;
    dot.style.backgroundColor = color;
    dot.title = `${fire.region} — ${Math.round(fire.brightness)}K, ${fire.frp}MW`;

    options.overlays.appendChild(dot);
  });
}
