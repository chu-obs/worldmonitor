import type { GeoProjection } from 'd3';
import { escapeHtml } from '@/utils/sanitize';
import { APT_GROUPS, GAMMA_IRRADIATORS, PORTS, SPACEPORTS, STRATEGIC_WATERWAYS } from '@/config';
import type { PopupType } from '../../MapPopup';

export type OverlayPopupHandler = (event: MouseEvent, type: PopupType, data: unknown) => void;

interface OverlayMarkerRenderOptions {
  projection: GeoProjection;
  overlays: HTMLElement;
  onMarkerClick: OverlayPopupHandler;
}

export function renderWaterwayOverlayMarkers(options: OverlayMarkerRenderOptions): void {
  STRATEGIC_WATERWAYS.forEach((waterway) => {
    const pos = options.projection([waterway.lon, waterway.lat]);
    if (!pos) return;

    const div = document.createElement('div');
    div.className = 'waterway-marker';
    div.style.left = `${pos[0]}px`;
    div.style.top = `${pos[1]}px`;
    div.title = waterway.name;

    const diamond = document.createElement('div');
    diamond.className = 'waterway-diamond';
    div.appendChild(diamond);

    div.addEventListener('click', (event) => {
      event.stopPropagation();
      options.onMarkerClick(event, 'waterway', waterway);
    });

    options.overlays.appendChild(div);
  });
}

export function renderPortOverlayMarkers(options: OverlayMarkerRenderOptions): void {
  PORTS.forEach((port) => {
    const pos = options.projection([port.lon, port.lat]);
    if (!pos) return;

    const div = document.createElement('div');
    div.className = `port-marker port-${port.type}`;
    div.style.left = `${pos[0]}px`;
    div.style.top = `${pos[1]}px`;

    const icon = document.createElement('div');
    icon.className = 'port-icon';
    icon.textContent = port.type === 'naval' ? '⚓' : port.type === 'oil' || port.type === 'lng' ? '🛢️' : '🏭';
    div.appendChild(icon);

    const label = document.createElement('div');
    label.className = 'port-label';
    label.textContent = port.name;
    div.appendChild(label);

    div.addEventListener('click', (event) => {
      event.stopPropagation();
      options.onMarkerClick(event, 'port', port);
    });

    options.overlays.appendChild(div);
  });
}

export function renderAptOverlayMarkers(options: OverlayMarkerRenderOptions): void {
  APT_GROUPS.forEach((apt) => {
    const pos = options.projection([apt.lon, apt.lat]);
    if (!pos) return;

    const div = document.createElement('div');
    div.className = 'apt-marker';
    div.style.left = `${pos[0]}px`;
    div.style.top = `${pos[1]}px`;
    div.innerHTML = `
      <div class="apt-icon">⚠</div>
      <div class="apt-label">${escapeHtml(apt.name)}</div>
    `;

    div.addEventListener('click', (event) => {
      event.stopPropagation();
      options.onMarkerClick(event, 'apt', apt);
    });

    options.overlays.appendChild(div);
  });
}

export function renderIrradiatorOverlayMarkers(options: OverlayMarkerRenderOptions): void {
  GAMMA_IRRADIATORS.forEach((irradiator) => {
    const pos = options.projection([irradiator.lon, irradiator.lat]);
    if (!pos) return;

    const div = document.createElement('div');
    div.className = 'irradiator-marker';
    div.style.left = `${pos[0]}px`;
    div.style.top = `${pos[1]}px`;
    div.title = `${irradiator.city}, ${irradiator.country}`;

    div.addEventListener('click', (event) => {
      event.stopPropagation();
      options.onMarkerClick(event, 'irradiator', irradiator);
    });

    options.overlays.appendChild(div);
  });
}

export function renderSpaceportOverlayMarkers(options: OverlayMarkerRenderOptions): void {
  SPACEPORTS.forEach((spaceport) => {
    const pos = options.projection([spaceport.lon, spaceport.lat]);
    if (!pos) return;

    const div = document.createElement('div');
    div.className = `spaceport-marker ${spaceport.status}`;
    div.style.left = `${pos[0]}px`;
    div.style.top = `${pos[1]}px`;

    const icon = document.createElement('div');
    icon.className = 'spaceport-icon';
    icon.textContent = '🚀';
    div.appendChild(icon);

    const label = document.createElement('div');
    label.className = 'spaceport-label';
    label.textContent = spaceport.name;
    div.appendChild(label);

    div.addEventListener('click', (event) => {
      event.stopPropagation();
      options.onMarkerClick(event, 'spaceport', spaceport);
    });

    options.overlays.appendChild(div);
  });
}
