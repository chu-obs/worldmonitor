export function getPolylineMidpoint(points: [number, number][]): [number, number] | null {
  if (points.length === 0) return null;
  return points[Math.floor(points.length / 2)] as [number, number];
}

interface TriggerEntityPopupBaseOptions<T, P, R> {
  id: string;
  items: readonly T[];
  getId: (item: T) => string;
  getPosition: (item: T) => P | null;
  getRelatedData?: (item: T) => R;
  onShown?: (item: T) => void;
}

interface TriggerEntityPopupStrictOptions<T, P, R> extends TriggerEntityPopupBaseOptions<T, P, R> {
  onShow: (item: T, position: P, relatedData?: R) => void;
  allowMissingPosition?: false;
}

interface TriggerEntityPopupLenientOptions<T, P, R> extends TriggerEntityPopupBaseOptions<T, P, R> {
  onShow: (item: T, position: P | null, relatedData?: R) => void;
  allowMissingPosition: true;
}

export function triggerEntityPopup<T, P, R = never>(options: TriggerEntityPopupStrictOptions<T, P, R>): void;
export function triggerEntityPopup<T, P, R = never>(options: TriggerEntityPopupLenientOptions<T, P, R>): void;
export function triggerEntityPopup<T, P, R = never>(
  options: TriggerEntityPopupStrictOptions<T, P, R> | TriggerEntityPopupLenientOptions<T, P, R>
): void {
  const item = options.items.find((entry) => options.getId(entry) === options.id);
  if (!item) return;

  const position = options.getPosition(item);
  if (position === null && !options.allowMissingPosition) return;

  const relatedData = options.getRelatedData?.(item);
  if (options.allowMissingPosition) {
    options.onShow(item, position, relatedData);
  } else {
    options.onShow(item, position as P, relatedData);
  }
  options.onShown?.(item);
}
