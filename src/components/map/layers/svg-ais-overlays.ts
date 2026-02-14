import type { GeoProjection, Selection } from 'd3';
import type { AisDensityZone, AisDisruptionEvent } from '@/types';
import type { PopupType } from '../../MapPopup';

export type OverlayPopupHandler = (event: MouseEvent, type: PopupType, data: unknown) => void;

interface AisDisruptionsRenderOptions {
  projection: GeoProjection;
  overlays: HTMLElement;
  aisDisruptions: AisDisruptionEvent[];
  onMarkerClick: OverlayPopupHandler;
}

interface AisDensityRenderOptions {
  projection: GeoProjection;
  dynamicLayerGroup: Selection<SVGGElement, unknown, null, undefined>;
  aisDensity: AisDensityZone[];
}

export function renderAisDisruptionOverlayMarkers(options: AisDisruptionsRenderOptions): void {
  options.aisDisruptions.forEach((event) => {
    const pos = options.projection([event.lon, event.lat]);
    if (!pos) return;

    const div = document.createElement('div');
    div.className = `ais-disruption-marker ${event.severity} ${event.type}`;
    div.style.left = `${pos[0]}px`;
    div.style.top = `${pos[1]}px`;

    const icon = document.createElement('div');
    icon.className = 'ais-disruption-icon';
    icon.textContent = event.type === 'gap_spike' ? '🛰️' : '🚢';
    div.appendChild(icon);

    const label = document.createElement('div');
    label.className = 'ais-disruption-label';
    label.textContent = event.name;
    div.appendChild(label);

    div.addEventListener('click', (markerEvent) => {
      markerEvent.stopPropagation();
      options.onMarkerClick(markerEvent, 'ais', event);
    });

    options.overlays.appendChild(div);
  });
}

export function renderAisDensityOverlayLayer(options: AisDensityRenderOptions): void {
  const densityGroup = options.dynamicLayerGroup.append('g').attr('class', 'ais-density');

  options.aisDensity.forEach((zone) => {
    const pos = options.projection([zone.lon, zone.lat]);
    if (!pos) return;

    const intensity = Math.min(Math.max(zone.intensity, 0.15), 1);
    const radius = 4 + intensity * 8;
    const isCongested = zone.deltaPct >= 15;
    const color = isCongested ? '#ffb703' : '#00d1ff';
    const fillOpacity = 0.15 + intensity * 0.25;

    densityGroup
      .append('circle')
      .attr('class', 'ais-density-spot')
      .attr('cx', pos[0])
      .attr('cy', pos[1])
      .attr('r', radius)
      .attr('fill', color)
      .attr('fill-opacity', fillOpacity)
      .attr('stroke', 'none');
  });
}
