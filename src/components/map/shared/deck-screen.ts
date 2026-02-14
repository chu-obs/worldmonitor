import type maplibregl from 'maplibre-gl';

export interface DeckScreenPoint {
  x: number;
  y: number;
}

const FLASH_ANIMATION_STYLE_ID = 'flash-animation-styles';
const DECK_WRAPPER_SELECTOR = '.deckgl-map-wrapper';

export function getDeckContainerCenter(container: HTMLElement): DeckScreenPoint {
  const rect = container.getBoundingClientRect();
  return { x: rect.width / 2, y: rect.height / 2 };
}

export function projectDeckLocationToScreen(
  map: maplibregl.Map | null,
  lat: number,
  lon: number,
): DeckScreenPoint | null {
  if (!map) return null;
  const point = map.project([lon, lat]);
  return { x: point.x, y: point.y };
}

export function resolveDeckPopupPosition(
  container: HTMLElement,
  screenPos: DeckScreenPoint | null,
): DeckScreenPoint {
  return screenPos || getDeckContainerCenter(container);
}

function ensureDeckFlashAnimationStyles(): void {
  if (document.getElementById(FLASH_ANIMATION_STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = FLASH_ANIMATION_STYLE_ID;
  style.textContent = `
    @keyframes flash-pulse {
      0% { transform: translate(-50%, -50%) scale(1); opacity: 1; }
      100% { transform: translate(-50%, -50%) scale(2); opacity: 0; }
    }
  `;
  document.head.appendChild(style);
}

export function flashDeckLocationMarker(
  container: HTMLElement,
  screenPos: DeckScreenPoint,
  durationMs: number,
): void {
  const wrapper = container.querySelector(DECK_WRAPPER_SELECTOR);
  if (!(wrapper instanceof HTMLElement)) return;

  ensureDeckFlashAnimationStyles();

  const flashMarker = document.createElement('div');
  flashMarker.className = 'flash-location-marker';
  flashMarker.style.cssText = `
    position: absolute;
    width: 40px;
    height: 40px;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.5);
    border: 2px solid #fff;
    animation: flash-pulse 0.5s ease-out infinite;
    pointer-events: none;
    z-index: 1000;
    left: ${screenPos.x}px;
    top: ${screenPos.y}px;
    transform: translate(-50%, -50%);
  `;

  wrapper.appendChild(flashMarker);
  setTimeout(() => flashMarker.remove(), durationMs);
}
