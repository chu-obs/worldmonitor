import type { GeoProjection } from 'd3';
import { AI_DATA_CENTERS, CONFLICT_ZONES, CRITICAL_MINERALS } from '@/config';
import type { PopupType } from '../../MapPopup';

export type OverlayPopupHandler = (event: MouseEvent, type: PopupType, data: unknown) => void;

interface BaseOverlayRenderOptions {
  projection: GeoProjection;
  overlays: HTMLElement;
  onMarkerClick: OverlayPopupHandler;
}

interface DatacenterOverlayRenderOptions extends BaseOverlayRenderOptions {
  highlightedDatacenterIds: Set<string>;
}

export function renderConflictClickAreas(options: BaseOverlayRenderOptions): void {
  CONFLICT_ZONES.forEach((zone) => {
    const centerPos = options.projection(zone.center as [number, number]);
    if (!centerPos) return;

    const clickArea = document.createElement('div');
    clickArea.className = 'conflict-click-area';
    clickArea.style.left = `${centerPos[0] - 40}px`;
    clickArea.style.top = `${centerPos[1] - 20}px`;
    clickArea.style.width = '80px';
    clickArea.style.height = '40px';
    clickArea.style.cursor = 'pointer';

    clickArea.addEventListener('click', (event) => {
      event.stopPropagation();
      options.onMarkerClick(event, 'conflict', zone);
    });

    options.overlays.appendChild(clickArea);
  });
}

export function renderDatacenterOverlayMarkers(options: DatacenterOverlayRenderOptions): void {
  const minGpuCount = 10000;
  AI_DATA_CENTERS.filter((dc) => (dc.chipCount || 0) >= minGpuCount).forEach((dc) => {
    const pos = options.projection([dc.lon, dc.lat]);
    if (!pos) return;

    const div = document.createElement('div');
    const isHighlighted = options.highlightedDatacenterIds.has(dc.id);
    div.className = `datacenter-marker ${dc.status}${isHighlighted ? ' asset-highlight asset-highlight-datacenter' : ''}`;
    div.style.left = `${pos[0]}px`;
    div.style.top = `${pos[1]}px`;

    const icon = document.createElement('div');
    icon.className = 'datacenter-icon';
    icon.textContent = '🖥️';
    div.appendChild(icon);

    div.addEventListener('click', (event) => {
      event.stopPropagation();
      options.onMarkerClick(event, 'datacenter', dc);
    });

    options.overlays.appendChild(div);
  });
}

export function renderMineralOverlayMarkers(options: BaseOverlayRenderOptions): void {
  CRITICAL_MINERALS.forEach((mine) => {
    const pos = options.projection([mine.lon, mine.lat]);
    if (!pos) return;

    const div = document.createElement('div');
    div.className = `mineral-marker ${mine.status}`;
    div.style.left = `${pos[0]}px`;
    div.style.top = `${pos[1]}px`;

    const icon = document.createElement('div');
    icon.className = 'mineral-icon';
    icon.textContent = mine.mineral === 'Lithium' ? '🔋' : mine.mineral === 'Rare Earths' ? '🧲' : '💎';
    div.appendChild(icon);

    const label = document.createElement('div');
    label.className = 'mineral-label';
    label.textContent = `${mine.mineral} - ${mine.name}`;
    div.appendChild(label);

    div.addEventListener('click', (event) => {
      event.stopPropagation();
      options.onMarkerClick(event, 'mineral', mine);
    });

    options.overlays.appendChild(div);
  });
}
