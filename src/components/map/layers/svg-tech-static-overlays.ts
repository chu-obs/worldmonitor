import type { GeoProjection } from 'd3';
import { ACCELERATORS, CLOUD_REGIONS, STARTUP_HUBS } from '@/config';
import type { PopupType } from '../../MapPopup';

export type OverlayPopupHandler = (event: MouseEvent, type: PopupType, data: unknown) => void;

interface TechOverlayRenderOptions {
  projection: GeoProjection;
  overlays: HTMLElement;
  zoom: number;
  onMarkerClick: OverlayPopupHandler;
}

export function renderStartupHubOverlayMarkers(options: TechOverlayRenderOptions): void {
  STARTUP_HUBS.forEach((hub) => {
    const pos = options.projection([hub.lon, hub.lat]);
    if (!pos) return;

    const div = document.createElement('div');
    div.className = `startup-hub-marker ${hub.tier}`;
    div.style.left = `${pos[0]}px`;
    div.style.top = `${pos[1]}px`;

    const icon = document.createElement('div');
    icon.className = 'startup-hub-icon';
    icon.textContent = hub.tier === 'mega' ? '🦄' : hub.tier === 'major' ? '🚀' : '💡';
    div.appendChild(icon);

    if (options.zoom >= 2 || hub.tier === 'mega') {
      const label = document.createElement('div');
      label.className = 'startup-hub-label';
      label.textContent = hub.name;
      div.appendChild(label);
    }

    div.addEventListener('click', (event) => {
      event.stopPropagation();
      options.onMarkerClick(event, 'startupHub', hub);
    });

    options.overlays.appendChild(div);
  });
}

export function renderCloudRegionOverlayMarkers(options: TechOverlayRenderOptions): void {
  CLOUD_REGIONS.forEach((region) => {
    const pos = options.projection([region.lon, region.lat]);
    if (!pos) return;

    const div = document.createElement('div');
    div.className = `cloud-region-marker ${region.provider}`;
    div.style.left = `${pos[0]}px`;
    div.style.top = `${pos[1]}px`;

    const icon = document.createElement('div');
    icon.className = 'cloud-region-icon';
    const icons: Record<string, string> = { aws: '🟠', gcp: '🔵', azure: '🟣', cloudflare: '🟡' };
    icon.textContent = icons[region.provider] || '☁️';
    div.appendChild(icon);

    if (options.zoom >= 3) {
      const label = document.createElement('div');
      label.className = 'cloud-region-label';
      label.textContent = region.provider.toUpperCase();
      div.appendChild(label);
    }

    div.addEventListener('click', (event) => {
      event.stopPropagation();
      options.onMarkerClick(event, 'cloudRegion', region);
    });

    options.overlays.appendChild(div);
  });
}

export function renderAcceleratorOverlayMarkers(options: TechOverlayRenderOptions): void {
  ACCELERATORS.forEach((accelerator) => {
    const pos = options.projection([accelerator.lon, accelerator.lat]);
    if (!pos) return;

    const div = document.createElement('div');
    div.className = `accelerator-marker ${accelerator.type}`;
    div.style.left = `${pos[0]}px`;
    div.style.top = `${pos[1]}px`;

    const icon = document.createElement('div');
    icon.className = 'accelerator-icon';
    icon.textContent = accelerator.type === 'accelerator' ? '🎯' : accelerator.type === 'incubator' ? '🔬' : '🎨';
    div.appendChild(icon);

    if (options.zoom >= 3) {
      const label = document.createElement('div');
      label.className = 'accelerator-label';
      label.textContent = accelerator.name;
      div.appendChild(label);
    }

    div.addEventListener('click', (event) => {
      event.stopPropagation();
      options.onMarkerClick(event, 'accelerator', accelerator);
    });

    options.overlays.appendChild(div);
  });
}
