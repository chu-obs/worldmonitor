import { getShareUrlFromMap } from '@/app/state/url-sync';
import { resetIdleTimerFlow, setupIdleDetectionFlow } from './idle-detection';
import { setupMapPinFlow, setupMapResizeFlow } from './map-controls';
import { copyTextToClipboard, setCopyFeedback, toggleFullscreenMode } from './share-controls';
import { wireCoreEventListeners } from './event-wiring';
import type { MapContainer } from '@/components';

type TimeoutId = ReturnType<typeof setTimeout>;

interface IdleStateBindings {
  idlePauseMs: number;
  getIsIdle: () => boolean;
  setIsIdle: (isIdle: boolean) => void;
  getIdleTimeoutId: () => TimeoutId | null;
  setIdleTimeoutId: (timeoutId: TimeoutId | null) => void;
  setBoundIdleResetHandler: (handler: (() => void) | null) => void;
}

interface SetupCoreEventHandlersFlowOptions {
  map: MapContainer | null;
  openSearchModal: () => void;
  updateSearchIndex: () => void;
  setupSourcesModal: () => void;
  idleState: IdleStateBindings;
  onFocalPointsReady: () => void;
  onVisibilityHidden: () => void;
}

export function setupCoreEventHandlersFlow(options: SetupCoreEventHandlersFlowOptions): {
  resizeHandler: () => void;
  fullscreenHandler: () => void;
  visibilityHandler: () => void;
} {
  return wireCoreEventListeners({
    map: options.map,
    updateSearchIndex: options.updateSearchIndex,
    openSearchModal: options.openSearchModal,
    onCopyShareLink: async () => {
      if (!options.map) return;
      const shareUrl = getShareUrlFromMap(options.map);
      const button = document.getElementById('copyLinkBtn');
      try {
        await copyTextToClipboard(shareUrl);
        setCopyFeedback(button, 'Copied!');
      } catch (error) {
        console.warn('Failed to copy share link:', error);
        setCopyFeedback(button, 'Copy failed');
      }
    },
    onToggleFullscreen: () => toggleFullscreenMode(),
    onSetupSourcesModal: options.setupSourcesModal,
    onSetupMapResize: () => setupMapResizeFlow({ map: options.map }),
    onSetupMapPin: () => setupMapPinFlow(),
    onSetupIdleDetection: () => {
      setupIdleDetectionFlow(options.idleState, {
        onActive: () => {
          document.body.classList.remove('animations-paused');
        },
        onIdle: () => {
          document.body.classList.add('animations-paused');
          console.log('[App] User idle - pausing animations to save resources');
        },
      });
    },
    onFocalPointsReady: options.onFocalPointsReady,
    onVisibilityHidden: options.onVisibilityHidden,
    onVisibilityVisible: () => {
      resetIdleTimerFlow(options.idleState, {
        onIdle: () => {
          document.body.classList.add('animations-paused');
          console.log('[App] User idle - pausing animations to save resources');
        },
      });
    },
  });
}
