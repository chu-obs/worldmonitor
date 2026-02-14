import type { MapLayers } from '@/types';

function getLayerToggleElement(container: HTMLElement, layer: keyof MapLayers): HTMLInputElement | null {
  const element = container.querySelector(`.layer-toggle[data-layer="${layer}"] input`);
  return element instanceof HTMLInputElement ? element : null;
}

function getLayerToggleContainer(container: HTMLElement, layer: keyof MapLayers): HTMLElement | null {
  const element = container.querySelector(`.layer-toggle[data-layer="${layer}"]`);
  return element instanceof HTMLElement ? element : null;
}

export function setDeckLayerToggleChecked(
  container: HTMLElement,
  layer: keyof MapLayers,
  checked: boolean,
): void {
  const toggle = getLayerToggleElement(container, layer);
  if (toggle) toggle.checked = checked;
}

export function setDeckLayerToggleVisibility(
  container: HTMLElement,
  layer: keyof MapLayers,
  visible: boolean,
): void {
  const toggle = getLayerToggleContainer(container, layer);
  if (!toggle) return;
  toggle.style.display = visible ? '' : 'none';
}

export function setDeckLayerToggleLoading(
  container: HTMLElement,
  layer: keyof MapLayers,
  loading: boolean,
): void {
  const toggle = getLayerToggleContainer(container, layer);
  if (!toggle) return;
  toggle.classList.toggle('loading', loading);
}

export function setDeckLayerToggleReady(
  container: HTMLElement,
  layer: keyof MapLayers,
  layerEnabled: boolean,
  hasData: boolean,
): void {
  const toggle = getLayerToggleContainer(container, layer);
  if (!toggle) return;

  toggle.classList.remove('loading');
  if (layerEnabled && hasData) {
    toggle.classList.add('active');
  } else {
    toggle.classList.remove('active');
  }
}
