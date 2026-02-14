import type { GeoProjection } from 'd3';
import type { Earthquake } from '@/types';
import type { PopupType } from '../../MapPopup';

export type OverlayPopupHandler = (event: MouseEvent, type: PopupType, data: unknown) => void;

interface EarthquakeOverlayRenderOptions {
  projection: GeoProjection;
  overlays: HTMLElement;
  earthquakes: Earthquake[];
  onMarkerClick: OverlayPopupHandler;
}

export function renderEarthquakeOverlayMarkers(options: EarthquakeOverlayRenderOptions): number {
  let rendered = 0;

  options.earthquakes.forEach((earthquake) => {
    const pos = options.projection([earthquake.lon, earthquake.lat]);
    if (!pos) {
      return;
    }

    rendered += 1;
    const size = Math.max(8, earthquake.magnitude * 3);

    const div = document.createElement('div');
    div.className = 'earthquake-marker';
    div.style.left = `${pos[0]}px`;
    div.style.top = `${pos[1]}px`;
    div.style.width = `${size}px`;
    div.style.height = `${size}px`;
    div.title = `M${earthquake.magnitude.toFixed(1)} - ${earthquake.place}`;

    const label = document.createElement('div');
    label.className = 'earthquake-label';
    label.textContent = `M${earthquake.magnitude.toFixed(1)}`;
    div.appendChild(label);

    div.addEventListener('click', (event) => {
      event.stopPropagation();
      options.onMarkerClick(event, 'earthquake', earthquake);
    });

    options.overlays.appendChild(div);
  });

  return rendered;
}
