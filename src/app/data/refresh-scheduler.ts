export type RefreshCondition = () => boolean;
export type RefreshTask = () => Promise<void>;

interface RefreshSchedulerOptions {
  inFlight: Set<string>;
  isDestroyed: () => boolean;
  onError?: (name: string, error: unknown) => void;
}

const HIDDEN_REFRESH_MULTIPLIER = 4;
const JITTER_FRACTION = 0.1;
const MIN_REFRESH_MS = 1000;

export class RefreshScheduler {
  private readonly inFlight: Set<string>;
  private readonly isDestroyed: () => boolean;
  private readonly onError: (name: string, error: unknown) => void;
  private readonly timeoutIds: Map<string, ReturnType<typeof setTimeout>> = new Map();

  constructor(options: RefreshSchedulerOptions) {
    this.inFlight = options.inFlight;
    this.isDestroyed = options.isDestroyed;
    this.onError = options.onError || (() => {});
  }

  public schedule(
    name: string,
    task: RefreshTask,
    intervalMs: number,
    condition?: RefreshCondition
  ): void {
    const computeDelay = (isHidden: boolean) => {
      const adjusted = intervalMs * (isHidden ? HIDDEN_REFRESH_MULTIPLIER : 1);
      const jitterRange = adjusted * JITTER_FRACTION;
      const jittered = adjusted + (Math.random() * 2 - 1) * jitterRange;
      return Math.max(MIN_REFRESH_MS, Math.round(jittered));
    };

    const scheduleNext = (isHidden: boolean) => {
      if (this.isDestroyed()) return;
      this.clearTimeout(name);
      const timeoutId = setTimeout(run, computeDelay(isHidden));
      this.timeoutIds.set(name, timeoutId);
    };

    const run = async () => {
      if (this.isDestroyed()) return;

      const isHidden = this.isDocumentHidden();
      if (isHidden) {
        scheduleNext(true);
        return;
      }

      if (condition && !condition()) {
        scheduleNext(false);
        return;
      }

      if (this.inFlight.has(name)) {
        scheduleNext(false);
        return;
      }

      this.inFlight.add(name);
      try {
        await task();
      } catch (error) {
        this.onError(name, error);
      } finally {
        this.inFlight.delete(name);
        scheduleNext(false);
      }
    };

    scheduleNext(this.isDocumentHidden());
  }

  public cancelAll(): void {
    for (const timeoutId of this.timeoutIds.values()) {
      clearTimeout(timeoutId);
    }
    this.timeoutIds.clear();
  }

  private clearTimeout(name: string): void {
    const existing = this.timeoutIds.get(name);
    if (existing) {
      clearTimeout(existing);
      this.timeoutIds.delete(name);
    }
  }

  private isDocumentHidden(): boolean {
    return typeof document !== 'undefined' && document.visibilityState === 'hidden';
  }
}
