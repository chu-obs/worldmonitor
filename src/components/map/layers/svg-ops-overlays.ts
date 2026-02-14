import type { GeoProjection } from 'd3';
import type { AirportDelayAlert, SocialUnrestEvent } from '@/types';
import type { PopupType } from '../../MapPopup';

export type OverlayPopupHandler = (event: MouseEvent, type: PopupType, data: unknown) => void;

interface Cluster<T> {
  items: T[];
  pos: [number, number];
}

interface ProtestClusterOverlayRenderOptions {
  overlays: HTMLElement;
  clusters: Array<Cluster<SocialUnrestEvent>>;
  onMarkerClick: OverlayPopupHandler;
}

interface FlightDelayOverlayRenderOptions {
  projection: GeoProjection;
  overlays: HTMLElement;
  flightDelays: AirportDelayAlert[];
  zoom: number;
  onMarkerClick: OverlayPopupHandler;
}

export function renderProtestClusterOverlayMarkers(options: ProtestClusterOverlayRenderOptions): void {
  options.clusters.forEach((cluster) => {
    if (cluster.items.length === 0) return;
    const div = document.createElement('div');
    const isCluster = cluster.items.length > 1;
    const primaryEvent = cluster.items[0]!;
    const hasRiot = cluster.items.some((event) => event.eventType === 'riot');
    const hasHighSeverity = cluster.items.some((event) => event.severity === 'high');

    div.className = `protest-marker ${hasHighSeverity ? 'high' : primaryEvent.severity} ${hasRiot ? 'riot' : primaryEvent.eventType} ${isCluster ? 'cluster' : ''}`;
    div.style.left = `${cluster.pos[0]}px`;
    div.style.top = `${cluster.pos[1]}px`;

    const icon = document.createElement('div');
    icon.className = 'protest-icon';
    icon.textContent = hasRiot ? '🔥' : primaryEvent.eventType === 'strike' ? '✊' : '📢';
    div.appendChild(icon);

    if (isCluster) {
      const badge = document.createElement('div');
      badge.className = 'cluster-badge';
      badge.textContent = String(cluster.items.length);
      div.appendChild(badge);
      div.title = `${primaryEvent.country}: ${cluster.items.length} events`;
    } else {
      div.title = `${primaryEvent.city || primaryEvent.country} - ${primaryEvent.eventType} (${primaryEvent.severity})`;
      if (primaryEvent.validated) {
        div.classList.add('validated');
      }
    }

    div.addEventListener('click', (event) => {
      event.stopPropagation();
      if (isCluster) {
        options.onMarkerClick(event, 'protestCluster', {
          items: cluster.items,
          country: primaryEvent.country,
        });
      } else {
        options.onMarkerClick(event, 'protest', primaryEvent);
      }
    });

    options.overlays.appendChild(div);
  });
}

export function renderFlightDelayOverlayMarkers(options: FlightDelayOverlayRenderOptions): void {
  options.flightDelays.forEach((delay) => {
    const pos = options.projection([delay.lon, delay.lat]);
    if (!pos) return;

    const div = document.createElement('div');
    div.className = `flight-delay-marker ${delay.severity}`;
    div.style.left = `${pos[0]}px`;
    div.style.top = `${pos[1]}px`;

    const icon = document.createElement('div');
    icon.className = 'flight-delay-icon';
    icon.textContent = delay.delayType === 'ground_stop' ? '🛑' : delay.severity === 'severe' ? '✈️' : '🛫';
    div.appendChild(icon);

    if (options.zoom >= 3) {
      const label = document.createElement('div');
      label.className = 'flight-delay-label';
      label.textContent = `${delay.iata} ${delay.avgDelayMinutes > 0 ? `+${delay.avgDelayMinutes}m` : ''}`;
      div.appendChild(label);
    }

    div.addEventListener('click', (event) => {
      event.stopPropagation();
      options.onMarkerClick(event, 'flight', delay);
    });

    options.overlays.appendChild(div);
  });
}
