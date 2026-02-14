import type { GeoProjection } from 'd3';
import type { CableAdvisory, RepairShip } from '@/types';
import type { PopupType } from '../../MapPopup';

export type OverlayPopupHandler = (event: MouseEvent, type: PopupType, data: unknown) => void;

interface CableOperationsOverlayRenderOptions {
  projection: GeoProjection;
  overlays: HTMLElement;
  cableAdvisories: CableAdvisory[];
  repairShips: RepairShip[];
  getCableName: (cableId: string) => string;
  onMarkerClick: OverlayPopupHandler;
}

export function renderCableOperationsOverlayMarkers(options: CableOperationsOverlayRenderOptions): void {
  options.cableAdvisories.forEach((advisory) => {
    const pos = options.projection([advisory.lon, advisory.lat]);
    if (!pos) return;

    const div = document.createElement('div');
    div.className = `cable-advisory-marker ${advisory.severity}`;
    div.style.left = `${pos[0]}px`;
    div.style.top = `${pos[1]}px`;

    const icon = document.createElement('div');
    icon.className = 'cable-advisory-icon';
    icon.textContent = advisory.severity === 'fault' ? '⚡' : '⚠';
    div.appendChild(icon);

    const label = document.createElement('div');
    label.className = 'cable-advisory-label';
    label.textContent = options.getCableName(advisory.cableId);
    div.appendChild(label);

    div.addEventListener('click', (event) => {
      event.stopPropagation();
      options.onMarkerClick(event, 'cable-advisory', advisory);
    });

    options.overlays.appendChild(div);
  });

  options.repairShips.forEach((ship) => {
    const pos = options.projection([ship.lon, ship.lat]);
    if (!pos) return;

    const div = document.createElement('div');
    div.className = `repair-ship-marker ${ship.status}`;
    div.style.left = `${pos[0]}px`;
    div.style.top = `${pos[1]}px`;

    const icon = document.createElement('div');
    icon.className = 'repair-ship-icon';
    icon.textContent = '🚢';
    div.appendChild(icon);

    const label = document.createElement('div');
    label.className = 'repair-ship-label';
    label.textContent = ship.name;
    div.appendChild(label);

    div.addEventListener('click', (event) => {
      event.stopPropagation();
      options.onMarkerClick(event, 'repair-ship', ship);
    });

    options.overlays.appendChild(div);
  });
}
