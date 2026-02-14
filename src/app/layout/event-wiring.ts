import type { MapView } from '@/components';

interface MapEventAdapter {
  setView: (view: MapView) => void;
  render: () => void;
}

interface WireCoreEventListenersOptions {
  map: MapEventAdapter | null;
  updateSearchIndex: () => void;
  openSearchModal: () => void;
  onCopyShareLink: () => Promise<void>;
  onToggleFullscreen: () => void;
  onSetupSourcesModal: () => void;
  onSetupMapResize: () => void;
  onSetupMapPin: () => void;
  onSetupIdleDetection: () => void;
  onFocalPointsReady: () => void;
  onVisibilityHidden: () => void;
  onVisibilityVisible: () => void;
}

interface CoreBoundHandlers {
  resizeHandler: () => void;
  fullscreenHandler: () => void;
  visibilityHandler: () => void;
}

export function wireCoreEventListeners(
  options: WireCoreEventListenersOptions
): CoreBoundHandlers {
  const {
    map,
    updateSearchIndex,
    openSearchModal,
    onCopyShareLink,
    onToggleFullscreen,
    onSetupSourcesModal,
    onSetupMapResize,
    onSetupMapPin,
    onSetupIdleDetection,
    onFocalPointsReady,
    onVisibilityHidden,
    onVisibilityVisible,
  } = options;

  // Search button
  document.getElementById('searchBtn')?.addEventListener('click', () => {
    updateSearchIndex();
    openSearchModal();
  });

  // Copy link button
  document.getElementById('copyLinkBtn')?.addEventListener('click', async () => {
    await onCopyShareLink();
  });

  // Settings modal
  document.getElementById('settingsBtn')?.addEventListener('click', () => {
    document.getElementById('settingsModal')?.classList.add('active');
  });

  document.getElementById('modalClose')?.addEventListener('click', () => {
    document.getElementById('settingsModal')?.classList.remove('active');
  });

  document.getElementById('settingsModal')?.addEventListener('click', (e) => {
    if ((e.target as HTMLElement).classList.contains('modal-overlay')) {
      document.getElementById('settingsModal')?.classList.remove('active');
    }
  });

  // Sources modal
  onSetupSourcesModal();

  // Fullscreen toggle
  const fullscreenBtn = document.getElementById('fullscreenBtn');
  fullscreenBtn?.addEventListener('click', () => onToggleFullscreen());
  const fullscreenHandler = () => {
    if (!fullscreenBtn) return;
    fullscreenBtn.textContent = document.fullscreenElement ? '⛶' : '⛶';
    fullscreenBtn.classList.toggle('active', !!document.fullscreenElement);
  };
  document.addEventListener('fullscreenchange', fullscreenHandler);

  // Region selector
  const regionSelect = document.getElementById('regionSelect') as HTMLSelectElement | null;
  regionSelect?.addEventListener('change', () => {
    map?.setView(regionSelect.value as MapView);
  });

  // Window resize
  const resizeHandler = () => {
    map?.render();
  };
  window.addEventListener('resize', resizeHandler);

  // Map section resize handle
  onSetupMapResize();

  // Map pin toggle
  onSetupMapPin();

  // Pause animations when tab is hidden, unload ML models to free memory
  const visibilityHandler = () => {
    document.body.classList.toggle('animations-paused', document.hidden);
    if (document.hidden) {
      onVisibilityHidden();
    } else {
      onVisibilityVisible();
    }
  };
  document.addEventListener('visibilitychange', visibilityHandler);

  // Refresh CII when focal points are ready (ensures focal point urgency is factored in)
  window.addEventListener('focal-points-ready', onFocalPointsReady);

  // Idle detection - pause animations after inactivity
  onSetupIdleDetection();

  return {
    resizeHandler,
    fullscreenHandler,
    visibilityHandler,
  };
}
