type TimeoutId = ReturnType<typeof setTimeout>;
type IntervalId = ReturnType<typeof setInterval>;

interface DestroyMapLike {
  destroy: () => void;
}

interface DestroyAppResourcesFlowOptions {
  timeIntervalId: IntervalId | null;
  snapshotIntervalId: IntervalId | null;
  idleTimeoutId: TimeoutId | null;
  boundKeydownHandler: ((event: KeyboardEvent) => void) | null;
  boundFullscreenHandler: (() => void) | null;
  boundResizeHandler: (() => void) | null;
  boundVisibilityHandler: (() => void) | null;
  boundIdleResetHandler: (() => void) | null;
  idleActivityEvents: readonly string[];
  map: DestroyMapLike | null;
  cancelRefreshes: () => void;
  disconnectAis: () => void;
}

interface DestroyAppResourcesResult {
  timeIntervalId: null;
  snapshotIntervalId: null;
  idleTimeoutId: null;
  boundKeydownHandler: null;
  boundFullscreenHandler: null;
  boundResizeHandler: null;
  boundVisibilityHandler: null;
  boundIdleResetHandler: null;
}

export function destroyAppResourcesFlow(
  options: DestroyAppResourcesFlowOptions
): DestroyAppResourcesResult {
  if (options.timeIntervalId) {
    clearInterval(options.timeIntervalId);
  }

  if (options.snapshotIntervalId) {
    clearInterval(options.snapshotIntervalId);
  }

  options.cancelRefreshes();

  if (options.boundKeydownHandler) {
    document.removeEventListener('keydown', options.boundKeydownHandler);
  }
  if (options.boundFullscreenHandler) {
    document.removeEventListener('fullscreenchange', options.boundFullscreenHandler);
  }
  if (options.boundResizeHandler) {
    window.removeEventListener('resize', options.boundResizeHandler);
  }
  if (options.boundVisibilityHandler) {
    document.removeEventListener('visibilitychange', options.boundVisibilityHandler);
  }

  if (options.idleTimeoutId) {
    clearTimeout(options.idleTimeoutId);
  }
  if (options.boundIdleResetHandler) {
    for (const eventName of options.idleActivityEvents) {
      document.removeEventListener(eventName, options.boundIdleResetHandler);
    }
  }

  options.map?.destroy();
  options.disconnectAis();

  return {
    timeIntervalId: null,
    snapshotIntervalId: null,
    idleTimeoutId: null,
    boundKeydownHandler: null,
    boundFullscreenHandler: null,
    boundResizeHandler: null,
    boundVisibilityHandler: null,
    boundIdleResetHandler: null,
  };
}
