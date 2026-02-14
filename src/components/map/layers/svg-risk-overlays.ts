import type { GeoProjection } from 'd3';
import { ECONOMIC_CENTERS } from '@/config';
import { getSeverityColor, type WeatherAlert } from '@/services/weather';
import type { InternetOutage } from '@/types';
import type { PopupType } from '../../MapPopup';

export type OverlayPopupHandler = (event: MouseEvent, type: PopupType, data: unknown) => void;

interface BaseOverlayRenderOptions {
  projection: GeoProjection;
  overlays: HTMLElement;
  onMarkerClick: OverlayPopupHandler;
}

interface WeatherOverlayRenderOptions extends BaseOverlayRenderOptions {
  weatherAlerts: WeatherAlert[];
}

interface OutageOverlayRenderOptions extends BaseOverlayRenderOptions {
  outages: InternetOutage[];
}

export function renderEconomicOverlayMarkers(options: BaseOverlayRenderOptions): void {
  ECONOMIC_CENTERS.forEach((center) => {
    const pos = options.projection([center.lon, center.lat]);
    if (!pos) return;

    const div = document.createElement('div');
    div.className = `economic-marker ${center.type}`;
    div.style.left = `${pos[0]}px`;
    div.style.top = `${pos[1]}px`;

    const icon = document.createElement('div');
    icon.className = 'economic-icon';
    icon.textContent = center.type === 'exchange' ? '📈' : center.type === 'central-bank' ? '🏛' : '💰';
    div.appendChild(icon);
    div.title = center.name;

    div.addEventListener('click', (event) => {
      event.stopPropagation();
      options.onMarkerClick(event, 'economic', center);
    });

    options.overlays.appendChild(div);
  });
}

export function renderWeatherOverlayMarkers(options: WeatherOverlayRenderOptions): void {
  options.weatherAlerts.forEach((alert) => {
    if (!alert.centroid) return;
    const pos = options.projection(alert.centroid);
    if (!pos) return;

    const div = document.createElement('div');
    div.className = `weather-marker ${alert.severity.toLowerCase()}`;
    div.style.left = `${pos[0]}px`;
    div.style.top = `${pos[1]}px`;
    div.style.borderColor = getSeverityColor(alert.severity);

    const icon = document.createElement('div');
    icon.className = 'weather-icon';
    icon.textContent = '⚠';
    div.appendChild(icon);

    div.addEventListener('click', (event) => {
      event.stopPropagation();
      options.onMarkerClick(event, 'weather', alert);
    });

    options.overlays.appendChild(div);
  });
}

export function renderOutageOverlayMarkers(options: OutageOverlayRenderOptions): void {
  options.outages.forEach((outage) => {
    const pos = options.projection([outage.lon, outage.lat]);
    if (!pos) return;

    const div = document.createElement('div');
    div.className = `outage-marker ${outage.severity}`;
    div.style.left = `${pos[0]}px`;
    div.style.top = `${pos[1]}px`;

    const icon = document.createElement('div');
    icon.className = 'outage-icon';
    icon.textContent = '📡';
    div.appendChild(icon);

    const label = document.createElement('div');
    label.className = 'outage-label';
    label.textContent = outage.country;
    div.appendChild(label);

    div.addEventListener('click', (event) => {
      event.stopPropagation();
      options.onMarkerClick(event, 'outage', outage);
    });

    options.overlays.appendChild(div);
  });
}
