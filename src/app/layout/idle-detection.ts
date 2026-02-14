export const IDLE_ACTIVITY_EVENTS = [
  'mousedown',
  'keydown',
  'scroll',
  'touchstart',
  'mousemove',
] as const;

type TimeoutId = ReturnType<typeof setTimeout>;

export interface IdleDetectionStateOptions {
  idlePauseMs: number;
  getIsIdle: () => boolean;
  setIsIdle: (isIdle: boolean) => void;
  getIdleTimeoutId: () => TimeoutId | null;
  setIdleTimeoutId: (timeoutId: TimeoutId | null) => void;
  setBoundIdleResetHandler: (handler: (() => void) | null) => void;
}

interface IdleDetectionCallbacks {
  onIdle: () => void;
  onActive: () => void;
}

export function resetIdleTimerFlow(
  state: IdleDetectionStateOptions,
  callbacks: Pick<IdleDetectionCallbacks, 'onIdle'>
): void {
  const existingTimeout = state.getIdleTimeoutId();
  if (existingTimeout) {
    clearTimeout(existingTimeout);
  }
  state.setIdleTimeoutId(setTimeout(() => {
    if (!document.hidden) {
      state.setIsIdle(true);
      callbacks.onIdle();
    }
  }, state.idlePauseMs));
}

export function setupIdleDetectionFlow(
  state: IdleDetectionStateOptions,
  callbacks: IdleDetectionCallbacks
): void {
  const resetHandler = () => {
    if (state.getIsIdle()) {
      state.setIsIdle(false);
      callbacks.onActive();
    }
    resetIdleTimerFlow(state, { onIdle: callbacks.onIdle });
  };

  state.setBoundIdleResetHandler(resetHandler);
  IDLE_ACTIVITY_EVENTS.forEach((eventName) => {
    document.addEventListener(eventName, resetHandler, { passive: true });
  });

  resetIdleTimerFlow(state, { onIdle: callbacks.onIdle });
}
