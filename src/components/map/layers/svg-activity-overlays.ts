import type { GeoProjection } from 'd3';
import type { GeoHubActivity } from '@/services/geo-activity';
import type { TechHubActivity } from '@/services/tech-activity';
import type { PopupType } from '../../MapPopup';

export type OverlayPopupHandler = (event: MouseEvent, type: PopupType, data: unknown) => void;

interface BaseActivityOverlayRenderOptions<T extends { lon: number; lat: number; newsCount: number; activityLevel: string }> {
  projection: GeoProjection;
  overlays: HTMLElement;
  activities: T[];
  zoom: number;
  onMarkerClick: OverlayPopupHandler;
}

interface TechActivityOverlayRenderOptions extends BaseActivityOverlayRenderOptions<TechHubActivity> {
  onActivitySelected?: (activity: TechHubActivity) => void;
}

interface GeoActivityOverlayRenderOptions extends BaseActivityOverlayRenderOptions<GeoHubActivity> {
  onActivitySelected?: (activity: GeoHubActivity) => void;
}

export function renderTechActivityOverlayMarkers(options: TechActivityOverlayRenderOptions): void {
  options.activities.forEach((activity) => {
    const pos = options.projection([activity.lon, activity.lat]);
    if (!pos) return;
    if (activity.newsCount === 0) return;

    const div = document.createElement('div');
    div.className = `tech-activity-marker ${activity.activityLevel}`;
    div.style.left = `${pos[0]}px`;
    div.style.top = `${pos[1]}px`;
    div.style.zIndex = activity.activityLevel === 'high' ? '60' : activity.activityLevel === 'elevated' ? '50' : '40';
    div.title = `${activity.city}: ${activity.newsCount} stories`;

    div.addEventListener('click', (event) => {
      event.stopPropagation();
      options.onActivitySelected?.(activity);
      options.onMarkerClick(event, 'techActivity', activity);
    });

    options.overlays.appendChild(div);

    if ((activity.activityLevel === 'high' || (activity.activityLevel === 'elevated' && options.zoom >= 2)) && options.zoom >= 1.5) {
      const label = document.createElement('div');
      label.className = 'tech-activity-label';
      label.textContent = activity.city;
      label.style.left = `${pos[0]}px`;
      label.style.top = `${pos[1] + 14}px`;
      options.overlays.appendChild(label);
    }
  });
}

export function renderGeoActivityOverlayMarkers(options: GeoActivityOverlayRenderOptions): void {
  options.activities.forEach((activity) => {
    const pos = options.projection([activity.lon, activity.lat]);
    if (!pos) return;
    if (activity.newsCount === 0) return;

    const div = document.createElement('div');
    div.className = `geo-activity-marker ${activity.activityLevel}`;
    div.style.left = `${pos[0]}px`;
    div.style.top = `${pos[1]}px`;
    div.style.zIndex = activity.activityLevel === 'high' ? '60' : activity.activityLevel === 'elevated' ? '50' : '40';
    div.title = `${activity.name}: ${activity.newsCount} stories`;

    div.addEventListener('click', (event) => {
      event.stopPropagation();
      options.onActivitySelected?.(activity);
      options.onMarkerClick(event, 'geoActivity', activity);
    });

    options.overlays.appendChild(div);
  });
}
